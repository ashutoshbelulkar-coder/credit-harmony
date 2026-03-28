package com.hcb.platform.repository;

import com.hcb.platform.model.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHashAndIsRevokedFalse(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.isRevoked = true, rt.revokedAt = CURRENT_TIMESTAMP " +
           "WHERE rt.user.id = :userId AND rt.isRevoked = false")
    void revokeAllByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.isRevoked = true, rt.revokedAt = CURRENT_TIMESTAMP " +
           "WHERE rt.tokenHash = :tokenHash")
    void revokeByTokenHash(@Param("tokenHash") String tokenHash);
}
