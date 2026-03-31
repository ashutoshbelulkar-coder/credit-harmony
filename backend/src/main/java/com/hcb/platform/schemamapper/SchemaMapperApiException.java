package com.hcb.platform.schemamapper;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class SchemaMapperApiException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public SchemaMapperApiException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }
}
