package com.ceyiz.app.service;

import com.ceyiz.app.entity.Category;
import com.ceyiz.app.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ListAccessService listAccessService;

    public Category createCategory(UUID listId, String name, UUID requesterId){

        listAccessService.requireAtLeastEditor(listId, requesterId);

        Category category = new Category(listId, name);
        return categoryRepository.save(category);
    }

    public List<Category> getCategoriesForList(UUID listId, UUID requesterId){

        listAccessService.requireAtLeastViewer(listId, requesterId);

        return categoryRepository.findByListId(listId);

    }

}
