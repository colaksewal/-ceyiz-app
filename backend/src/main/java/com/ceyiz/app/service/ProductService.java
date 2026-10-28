package com.ceyiz.app.service;

import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductStatus;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ListAccessService listAccessService;
    private final com.ceyiz.app.repository.SetItemRepository setItemRepository;
    private final com.ceyiz.app.repository.ProductSetRepository productSetRepository;

    /** Ürünleri, setten geldilerse parçalarıyla birlikte yanıta çevirir (tek sorguyla). */
    public List<com.ceyiz.app.dto.ProductResponse> toResponses(List<Product> products) {
        List<UUID> setIds = products.stream().map(Product::getProductSetId).filter(java.util.Objects::nonNull).distinct().toList();
        java.util.Map<UUID, List<com.ceyiz.app.dto.ProductResponse.Part>> partsBySet = setIds.isEmpty() ? java.util.Map.of()
                : setItemRepository.findBySetIdIn(setIds).stream().collect(java.util.stream.Collectors.groupingBy(
                        com.ceyiz.app.entity.SetItem::getSetId,
                        java.util.stream.Collectors.mapping(
                                item -> new com.ceyiz.app.dto.ProductResponse.Part(item.getItemName(), item.getQuantity()),
                                java.util.stream.Collectors.toList())));
        return products.stream()
                .map(product -> com.ceyiz.app.dto.ProductResponse.from(product,
                        product.getProductSetId() == null ? List.of()
                                : partsBySet.getOrDefault(product.getProductSetId(), List.of())))
                .toList();
    }

    /** Tek ürün (ürün sayfasının kartı için): adı, linki, durumu ve setten geldiyse parçaları. */
    public com.ceyiz.app.dto.ProductResponse getProduct(UUID productId, UUID requesterId) {
        var product = findProduct(productId);
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        listAccessService.requireAtLeastViewer(category.getListId(), requesterId);
        return toResponse(product);
    }

    public com.ceyiz.app.dto.ProductResponse toResponse(Product product) {
        return toResponses(List.of(product)).get(0);
    }


    public Product createProduct(UUID categoryId, String name ,UUID requesterId){


        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        Product product = new Product(categoryId, name);
        return productRepository.save(product);

    }

    public List<Product> getProductsForList(UUID categoryId, UUID requesterId){

        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        listAccessService.requireAtLeastViewer(category.getListId(), requesterId);

        return productRepository.findByCategoryId(categoryId);

    }

    public Product updateProduct(UUID productId, String name, ProductStatus status, UUID categoryId, String url, UUID requesterId){

        if (name != null && name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ürün adı boş olamaz");
        }

        var product = findProduct(productId);
        requireEditorForProduct(product, requesterId);

        if (name != null) product.rename(name.trim());
        if (status != null) product.changeStatus(status);
        if (url != null) product.changeUrl(LinkUtils.clean(url));
        if (categoryId != null && !categoryId.equals(product.getCategoryId())) {
            requireSameCategoryFamily(product, categoryId);
            product.moveTo(categoryId);
        }
        return productRepository.save(product);
    }

    // Fiyat notları ON DELETE CASCADE ile silinir, set kalemleri ise ON DELETE SET NULL ile
    // serbest metin kalemine dönüşür.
    public void deleteProduct(UUID productId, UUID requesterId){

        var product = findProduct(productId);
        requireEditorForProduct(product, requesterId);

        productRepository.delete(product);
        // Set ürünüyse setin kaydı (parçalarıyla) da silinir; böylece aynı set listeye yeniden eklenebilir.
        if (product.getProductSetId() != null) {
            productSetRepository.deleteById(product.getProductSetId());
        }
    }

    // Elle taşıma sadece aynı listede, aynı üst kategorinin kendisi ile alt kategorileri arasında olur.
    private void requireSameCategoryFamily(Product product, UUID targetId){
        var current = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        var target = categoryRepository.findById(targetId)
                .orElseThrow(() -> new IllegalArgumentException("Hedef kategori bulunamadı"));
        if (!familyRoot(current).equals(familyRoot(target)) || !current.getListId().equals(target.getListId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ürün sadece aynı kategorinin alt kategorileri arasında taşınabilir");
        }
    }

    private static UUID familyRoot(com.ceyiz.app.entity.Category category){
        return category.getParentId() != null ? category.getParentId() : category.getId();
    }

    private Product findProduct(UUID productId){
        return productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
    }

    private void requireEditorForProduct(Product product, UUID requesterId){
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);
    }




}
