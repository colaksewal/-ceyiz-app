package com.ceyiz.app.service;

import com.ceyiz.app.ai.AiInput;
import com.ceyiz.app.dto.ListSummaryResponse;
import com.ceyiz.app.dto.ListSummaryResponse.CategorySummary;
import com.ceyiz.app.dto.ListSummaryResponse.MemberSummary;
import com.ceyiz.app.dto.ListSummaryResponse.PriceSummary;
import com.ceyiz.app.dto.ListSummaryResponse.ProductSummary;
import com.ceyiz.app.dto.ListSummaryResponse.SetSummary;
import com.ceyiz.app.dto.ListSummaryResponse.Totals;
import com.ceyiz.app.dto.PaymentPlanResponse;
import com.ceyiz.app.entity.Category;
import com.ceyiz.app.entity.ListShare;
import com.ceyiz.app.entity.PriceEntry;
import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductStatus;
import com.ceyiz.app.entity.ShareRole;
import com.ceyiz.app.entity.TrousseauList;
import com.ceyiz.app.entity.User;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ListShareRepository;
import com.ceyiz.app.repository.PriceEntryRepository;
import com.ceyiz.app.repository.ProductRepository;
import com.ceyiz.app.repository.ProductSetRepository;
import com.ceyiz.app.repository.SetItemRepository;
import com.ceyiz.app.entity.PriceType;
import com.ceyiz.app.entity.ProductSet;
import com.ceyiz.app.entity.SetItem;
import com.ceyiz.app.repository.UserRepository;
import com.ceyiz.app.service.PaymentPlanCalculator.PlanItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Liste özeti, ödeme planı ve plan için AI yorumu. Görüntüleyici yetkisi yeterli: ekibin herkesi
 * özeti görebilir. Bütün veri birkaç toplu sorguyla çekilir (kategori/ürün başına sorgu yok).
 */
@Service
@RequiredArgsConstructor
public class ListSummaryService {

    private static final ZoneId ZONE = ZoneId.of("Europe/Istanbul");

    private final ListAccessService listAccessService;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PriceEntryRepository priceEntryRepository;
    private final ProductSetRepository productSetRepository;
    private final SetItemRepository setItemRepository;
    private final ListShareRepository listShareRepository;
    private final UserRepository userRepository;
    private final AiSuggestionService aiSuggestionService;
    private final AiJobService aiJobService;

    public ListSummaryResponse summary(UUID listId, UUID requesterId) {
        TrousseauList list = listAccessService.requireAtLeastViewer(listId, requesterId);
        return buildSummary(list);
    }

    public PaymentPlanResponse paymentPlan(UUID listId, UUID requesterId, BigDecimal monthlyBudget) {
        TrousseauList list = listAccessService.requireAtLeastViewer(listId, requesterId);
        return buildPlan(list, buildSummary(list), monthlyBudget);
    }

    /** Plan kodla hesaplanır, AI'ya sadece yorum yazdırılır. Arka planda çalışır, iş kimliği döner. */
    public UUID requestPlanAdvice(UUID listId, UUID requesterId, BigDecimal monthlyBudget) {
        TrousseauList list = listAccessService.requireAtLeastViewer(listId, requesterId);
        ListSummaryResponse summary = buildSummary(list);
        PaymentPlanResponse plan = buildPlan(list, summary, monthlyBudget);
        if (plan.plannedItemCount() == 0) {
            throw new IllegalArgumentException("Planlanacak, fiyatı girilmiş ürün yok");
        }
        String content = PlanAdviceText.build(summary, plan);
        AiInput input = new AiInput(null, null, content);
        return aiJobService.submit(requesterId, AiLogService.KIND_PLAN_ADVICE, input,
                () -> aiSuggestionService.advisePaymentPlan(input));
    }

    private ListSummaryResponse buildSummary(TrousseauList list) {
        List<Category> allCategories = categoryRepository.findByListId(list.getId());
        // Alt kategoriler "Mutfak › Pişirme" diye anılır; özet ve ödeme planı düz liste kalır.
        Map<UUID, String> displayNames = allCategories.stream().collect(Collectors.toMap(
                Category::getId,
                category -> allCategories.stream()
                        .filter(parent -> parent.getId().equals(category.getParentId()))
                        .findFirst()
                        .map(parent -> parent.getName() + " › " + category.getName())
                        .orElse(category.getName())));
        List<Category> categories = allCategories.stream()
                .sorted(Comparator.comparing((Category category) -> displayNames.get(category.getId()), String.CASE_INSENSITIVE_ORDER))
                .toList();
        List<Product> products = categories.isEmpty() ? List.of()
                : productRepository.findByCategoryIdIn(categories.stream().map(Category::getId).toList());
        Map<UUID, List<PriceEntry>> entriesByProduct = products.isEmpty() ? Map.of()
                : priceEntryRepository.findByProductIdIn(products.stream().map(Product::getId).toList()).stream()
                        .collect(Collectors.groupingBy(PriceEntry::getProductId));
        Map<UUID, List<Product>> productsByCategory = products.stream()
                .collect(Collectors.groupingBy(Product::getCategoryId));

        // Katalogdan listeye eklenen setler (bkz. ProductSetService.addFromTemplate): fiyat sette durur,
        // parça ürünleri fiyatsızdır. Elle girilen eski setler toplamlara katılmaya devam etmez.
        List<ProductSet> listSets = productSetRepository.findByListId(list.getId()).stream()
                .filter(set -> set.getSetTemplateId() != null && !set.isAsProduct())
                .toList();
        List<SetItem> setItems = listSets.isEmpty() ? List.of()
                : setItemRepository.findBySetIdIn(listSets.stream().map(ProductSet::getId).toList());
        Map<UUID, String> setNameByProduct = new HashMap<>();
        for (SetItem setItem : setItems) {
            if (setItem.getProductId() == null) continue;
            listSets.stream().filter(set -> set.getId().equals(setItem.getSetId())).findFirst()
                    .ifPresent(set -> setNameByProduct.putIfAbsent(setItem.getProductId(), set.getName()));
        }

        List<CategorySummary> categorySummaries = new ArrayList<>();
        int purchased = 0, planned = 0, skipped = 0, unpricedPlanned = 0;
        BigDecimal purchasedTotal = BigDecimal.ZERO, remainingTotal = BigDecimal.ZERO;

        for (Category category : categories) {
            List<ProductSummary> productSummaries = new ArrayList<>();
            int categoryPurchased = 0;
            BigDecimal categoryTotal = BigDecimal.ZERO;

            List<Product> categoryProducts = productsByCategory.getOrDefault(category.getId(), List.of()).stream()
                    .sorted(Comparator.comparing(Product::getName, String.CASE_INSENSITIVE_ORDER))
                    .toList();
            for (Product product : categoryProducts) {
                List<PriceEntry> entries = entriesByProduct.getOrDefault(product.getId(), List.of());
                PriceSummary price = choosePrice(entries).orElse(null);
                String setName = setNameByProduct.get(product.getId());
                productSummaries.add(new ProductSummary(product.getName(), product.getStatus(), price, entries.size(), setName));

                BigDecimal amount = price == null ? BigDecimal.ZERO : price.total();
                switch (product.getStatus()) {
                    case PURCHASED -> {
                        purchased++;
                        categoryPurchased++;
                        purchasedTotal = purchasedTotal.add(amount);
                        categoryTotal = categoryTotal.add(amount);
                    }
                    case PLANNED -> {
                        planned++;
                        if (price == null && setName == null) unpricedPlanned++;
                        remainingTotal = remainingTotal.add(amount);
                        categoryTotal = categoryTotal.add(amount);
                    }
                    case SKIPPED -> skipped++;
                }
            }
            categorySummaries.add(new CategorySummary(
                    displayNames.get(category.getId()), categoryProducts.size(), categoryPurchased, categoryTotal, productSummaries));
        }

        // Liste setleri tek kalem olarak sayılır: durum parçalarından türer (hepsi alındıysa alındı,
        // hepsi atlandıysa atlandı, aksi halde planlandı). Ürün sayıları setin parçalarıyla zaten sayıldı.
        Map<UUID, Product> productsById = products.stream().collect(Collectors.toMap(Product::getId, Function.identity()));
        for (ProductSet set : listSets) {
            List<ProductStatus> statuses = setItems.stream()
                    .filter(item -> item.getSetId().equals(set.getId()))
                    .map(item -> item.getProductId() == null ? null : productsById.get(item.getProductId()))
                    .filter(Objects::nonNull)
                    .map(Product::getStatus)
                    .toList();
            ProductStatus status = ProductStatus.PLANNED;
            if (!statuses.isEmpty() && statuses.stream().allMatch(s -> s == ProductStatus.PURCHASED)) {
                status = ProductStatus.PURCHASED;
            } else if (!statuses.isEmpty() && statuses.stream().allMatch(s -> s == ProductStatus.SKIPPED)) {
                status = ProductStatus.SKIPPED;
            }
            boolean priced = set.getSetPrice().signum() > 0;
            PriceSummary setPrice = priced
                    ? new PriceSummary(set.getStoreName(), set.getPriceType() == null ? PriceType.PESIN : set.getPriceType(),
                            set.getSetPrice(), set.getInstallmentCount(), set.getInstallmentAmount(), true)
                    : null;
            BigDecimal amount = priced ? set.getSetPrice() : BigDecimal.ZERO;
            switch (status) {
                case PURCHASED -> purchasedTotal = purchasedTotal.add(amount);
                case PLANNED -> {
                    remainingTotal = remainingTotal.add(amount);
                    if (!priced) unpricedPlanned++;
                }
                case SKIPPED -> { }
            }
            categorySummaries.add(new CategorySummary(
                    "Set: " + set.getName(), 1, status == ProductStatus.PURCHASED ? 1 : 0,
                    status == ProductStatus.SKIPPED ? BigDecimal.ZERO : amount,
                    List.of(new ProductSummary(set.getName(), status, setPrice, 0, null))));
        }

        List<SetSummary> sets = productSetRepository.findByListId(list.getId()).stream()
                .map(set -> new SetSummary(set.getName(), set.getStoreName(), set.getSetPrice()))
                .toList();

        return new ListSummaryResponse(
                list.getName(),
                list.getWeddingDate(),
                Instant.now(),
                new Totals(products.size(), purchased, planned, skipped, unpricedPlanned, purchasedTotal, remainingTotal),
                categorySummaries,
                sets,
                members(list)
        );
    }

    private PaymentPlanResponse buildPlan(TrousseauList list, ListSummaryResponse summary, BigDecimal monthlyBudget) {
        List<PlanItem> items = new ArrayList<>();
        List<String> unpriced = new ArrayList<>();
        for (CategorySummary category : summary.categories()) {
            for (ProductSummary product : category.products()) {
                if (product.status() != ProductStatus.PLANNED) continue;
                if (product.price() == null || product.price().total().signum() <= 0) {
                    // Sete bağlı parçanın fiyatı sette durur; fiyatsız sayılmaz.
                    if (product.setName() == null) unpriced.add(product.name());
                } else {
                    items.add(new PlanItem(category.name(), product.name(), product.price()));
                }
            }
        }
        return PaymentPlanCalculator.calculate(items, unpriced, list.getWeddingDate(), LocalDate.now(ZONE), monthlyBudget);
    }

    /** "Bunu kullan" denmiş fiyat; yoksa toplamı en düşük not. Toplamı hesaplanamayan notlar atlanır. */
    private static Optional<PriceSummary> choosePrice(List<PriceEntry> entries) {
        Optional<PriceEntry> preferred = entries.stream()
                .filter(PriceEntry::isPreferred)
                .filter(entry -> totalOf(entry) != null)
                .findFirst();
        Optional<PriceEntry> chosen = preferred.isPresent() ? preferred : entries.stream()
                .filter(entry -> totalOf(entry) != null)
                .min(Comparator.comparing(ListSummaryService::totalOf));
        return chosen.map(entry -> new PriceSummary(
                entry.getStoreName(),
                entry.getPriceType(),
                totalOf(entry),
                entry.getInstallmentCount(),
                entry.getInstallmentAmount(),
                entry.isPreferred()
        ));
    }

    /** Peşin fiyat; yoksa taksit sayısı × taksit tutarı. */
    private static BigDecimal totalOf(PriceEntry entry) {
        if (entry.getCashPrice() != null) {
            return entry.getCashPrice();
        }
        if (entry.getInstallmentCount() != null && entry.getInstallmentAmount() != null) {
            return entry.getInstallmentAmount().multiply(BigDecimal.valueOf(entry.getInstallmentCount()));
        }
        return null;
    }

    private List<MemberSummary> members(TrousseauList list) {
        List<ListShare> shares = listShareRepository.findByListId(list.getId());
        List<UUID> userIds = new ArrayList<>(shares.stream().map(ListShare::getUserId).toList());
        userIds.add(list.getOwnerId());
        Map<UUID, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<MemberSummary> members = new ArrayList<>();
        Optional.ofNullable(users.get(list.getOwnerId()))
                .ifPresent(owner -> members.add(new MemberSummary(owner.getName(), ShareRole.OWNER)));
        for (ListShare share : shares) {
            Optional.ofNullable(users.get(share.getUserId()))
                    .ifPresent(user -> members.add(new MemberSummary(user.getName(), share.getRole())));
        }
        return members;
    }
}
