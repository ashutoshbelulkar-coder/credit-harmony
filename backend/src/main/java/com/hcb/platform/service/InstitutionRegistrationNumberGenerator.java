package com.hcb.platform.service;

import java.time.Year;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Generates bureau member registration numbers when the client omits {@code registrationNumber}.
 * Final format: {@code {TypePrefix}-{NameSlug3}-{YYYY}-{idPadded}} (stable and unique via DB id).
 */
public final class InstitutionRegistrationNumberGenerator {

    private static final Map<String, String> TYPE_PREFIX = Map.ofEntries(
        Map.entry("Commercial Bank", "BK"),
        Map.entry("Credit Union", "CU"),
        Map.entry("NBFI", "NB"),
        Map.entry("Fintech", "FT"),
        Map.entry("Savings Bank", "SB"),
        Map.entry("MFI", "MF")
    );

    private InstitutionRegistrationNumberGenerator() {
    }

    /** True when the API should assign a registration number (omit, null, or blank). */
    public static boolean shouldAutoAssign(String registrationNumber) {
        return registrationNumber == null || registrationNumber.isBlank();
    }

    /**
     * Temporary unique value for first insert (NOT NULL + UNIQUE).
     * Replaced immediately after {@code id} is known.
     */
    public static String placeholderRegistrationNumber() {
        return "AUTO-" + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * Prefix from institution type (aligned with seed data such as BK-2024-00142).
     */
    public static String prefixForInstitutionType(String institutionType) {
        if (institutionType == null || institutionType.isBlank()) {
            return "XX";
        }
        String t = institutionType.trim();
        String p = TYPE_PREFIX.get(t);
        if (p != null) {
            return p;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < t.length() && sb.length() < 2; i++) {
            char c = t.charAt(i);
            if (Character.isLetterOrDigit(c)) {
                sb.append(Character.toUpperCase(c));
            }
        }
        if (sb.length() == 0) {
            return "XX";
        }
        if (sb.length() == 1) {
            sb.append('X');
        }
        return sb.toString();
    }

    /**
     * Up to 3 A–Z / 0–9 characters from legal name; pad with {@code X} if needed.
     */
    public static String slugFromLegalName(String legalName) {
        if (legalName == null || legalName.isBlank()) {
            return "XXX";
        }
        StringBuilder raw = new StringBuilder();
        for (char c : legalName.toCharArray()) {
            if (raw.length() >= 12) {
                break;
            }
            if (Character.isLetterOrDigit(c)) {
                raw.append(Character.toUpperCase(c));
            }
        }
        if (raw.isEmpty()) {
            return "XXX";
        }
        String s = raw.toString();
        if (s.length() >= 3) {
            return s.substring(0, 3);
        }
        return (s + "XXX").substring(0, 3);
    }

    /**
     * Year in UTC for stable cross-environment formatting.
     */
    public static int currentYearUtc() {
        return Year.now(ZoneOffset.UTC).getValue();
    }

    public static String buildFinalRegistrationNumber(String institutionType, String legalName, long institutionId) {
        String prefix = prefixForInstitutionType(institutionType);
        String slug = slugFromLegalName(legalName);
        int year = currentYearUtc();
        return String.format(Locale.ROOT, "%s-%s-%d-%05d", prefix, slug, year, institutionId);
    }
}
