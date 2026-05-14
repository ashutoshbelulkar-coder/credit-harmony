package com.hcb.platform.util;

import java.util.Locale;

public final class EmailMaskUtil {

    private EmailMaskUtil() {
    }

    /**
     * e.g. {@code admin@hcb.com} → {@code a***@hcb.com}
     */
    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "";
        }
        String e = email.trim().toLowerCase(Locale.ROOT);
        int at = e.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        String local = e.substring(0, at);
        String domain = e.substring(at);
        if (local.length() == 1) {
            return local.charAt(0) + "***" + domain;
        }
        return local.charAt(0) + "***" + domain;
    }
}
