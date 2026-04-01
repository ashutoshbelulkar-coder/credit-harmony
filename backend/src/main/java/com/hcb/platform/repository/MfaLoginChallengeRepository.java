package com.hcb.platform.repository;

import com.hcb.platform.model.entity.MfaLoginChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface MfaLoginChallengeRepository extends JpaRepository<MfaLoginChallenge, String> {

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM MfaLoginChallenge c WHERE c.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
