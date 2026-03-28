package com.hcb.platform.repository;

import com.hcb.platform.model.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    Optional<User> findByIdAndIsDeletedFalse(Long id);

    @Query("SELECT u FROM User u WHERE u.isDeleted = false " +
           "AND (:status IS NULL OR u.userAccountStatus = :status) " +
           "AND (:institutionId IS NULL OR u.institution.id = :institutionId)")
    Page<User> findAllActive(
        @Param("status") String status,
        @Param("institutionId") Long institutionId,
        Pageable pageable
    );

    boolean existsByEmailAndIsDeletedFalse(String email);
}
