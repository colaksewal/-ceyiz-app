package com.ceyiz.app.ai;

import java.util.Optional;

public interface AiClient {

    Optional<String> complete(String prompt);

}