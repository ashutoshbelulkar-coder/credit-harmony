package com.hcb.platform;

import com.hcb.platform.service.InstitutionRegistrationNumberGenerator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InstitutionRegistrationNumberGeneratorTest {

    @Test
    void slugFromLegalName_firstThreeAlnum() {
        assertThat(InstitutionRegistrationNumberGenerator.slugFromLegalName("Ita Registration Test Bank")).isEqualTo("ITA");
        assertThat(InstitutionRegistrationNumberGenerator.slugFromLegalName("  ")).isEqualTo("XXX");
    }

    @Test
    void buildFinal_matchesPattern() {
        int y = InstitutionRegistrationNumberGenerator.currentYearUtc();
        String s = InstitutionRegistrationNumberGenerator.buildFinalRegistrationNumber("Commercial Bank", "Acme Ltd", 42L);
        assertThat(s).isEqualTo("BK-ACM-" + y + "-00042");
    }

    @Test
    void prefixFintech() {
        assertThat(InstitutionRegistrationNumberGenerator.prefixForInstitutionType("Fintech")).isEqualTo("FT");
    }
}
