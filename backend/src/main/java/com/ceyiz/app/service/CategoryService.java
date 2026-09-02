package com.ceyiz.app.service;

import com.ceyiz.app.entity.Category;

import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ListRepository listRepository;

    public Category createCategory(UUID listId, String name, UUID requesterId){

        var list = listRepository.findById(listId).orElseThrow(() -> new IllegalArgumentException("Liste Bulunamadı"));

        if(!list.getOwnerId().equals(requesterId)){
            throw new SecurityException("Bu listeye kategori ekleme yetkiniz yok");
        }

        Category category = new Category(listId, name);
        return categoryRepository.save(category);
    }

    public List<Category> getCategoriesForList(UUID listId, UUID requesterId){

        var list = listRepository.findById(listId).orElseThrow(()-> new IllegalArgumentException("Liste bulunamadı"));

        if(!list.getOwnerId().equals(requesterId)){
            throw new SecurityException("Bu listeyi görüntüleme yetkiniz yok");
        }

        return categoryRepository.findByListId(listId);

    }

}
