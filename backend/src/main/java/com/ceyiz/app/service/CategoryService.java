package com.ceyiz.app.service;

import com.ceyiz.app.entity.Category;
import com.ceyiz.app.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ListAccessService listAccessService;

    public Category createCategory(UUID listId, String name, UUID parentId, UUID requesterId){

        listAccessService.requireAtLeastEditor(listId, requesterId);

        if (parentId != null) {
            var parent = findCategory(parentId);
            if (!parent.getListId().equals(listId)) {
                throw new IllegalArgumentException("Üst kategori bu listeye ait değil");
            }
            if (parent.getParentId() != null) {
                throw new IllegalArgumentException("Alt kategorinin altına kategori eklenemez");
            }
        }

        Category category = new Category(listId, parentId, name);
        return categoryRepository.save(category);
    }

    public List<Category> getCategoriesForList(UUID listId, UUID requesterId){

        listAccessService.requireAtLeastViewer(listId, requesterId);

        return categoryRepository.findByListId(listId);

    }

    public Category renameCategory(UUID categoryId, String name, UUID requesterId){

        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kategori adı boş olamaz");
        }

        var category = findCategory(categoryId);
        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        category.rename(name.trim());
        return categoryRepository.save(category);
    }

    // Ürünler, fiyat notları ve set kalemi bağlantıları DB'deki ON DELETE kurallarıyla temizlenir.
    public void deleteCategory(UUID categoryId, UUID requesterId){

        var category = findCategory(categoryId);
        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        categoryRepository.delete(category);
    }

    private Category findCategory(UUID categoryId){
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
    }

}
