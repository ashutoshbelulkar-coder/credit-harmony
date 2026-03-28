package com.hcb.platform.repository;

import com.hcb.platform.model.entity.Institution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InstitutionRepository extends JpaRepository<Institution, Long> {

    Optional<Institution> findByIdAndIsDeletedFalse(Long id);

    @Query("SELECT i FROM Institution i WHERE i.isDeleted = false " +
           "AND (:status IS NULL OR i.institutionLifecycleStatus = :status) " +
           "AND (:type IS NULL OR i.institutionType = :type) " +
           "AND (:jurisdiction IS NULL OR i.jurisdiction = :jurisdiction)")
    Page<Institution> findAllActive(
        @Param("status") String status,
        @Param("type") String type,
        @Param("jurisdiction") String jurisdiction,
        Pageable pageable
    );

    boolean existsByRegistrationNumberAndIsDeletedFalse(String registrationNumber);
}
