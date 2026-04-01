package com.hcb.platform.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Structured auth/MFA/captcha failures for {@link GlobalExceptionHandler}.
 */
@Getter
public class AuthOperationException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus status;
    private final Integer retryAfterSeconds;

    public AuthOperationException(String errorCode, String message, HttpStatus status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
        this.retryAfterSeconds = null;
    }

    public AuthOperationException(String errorCode, String message, HttpStatus status, int retryAfterSeconds) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
