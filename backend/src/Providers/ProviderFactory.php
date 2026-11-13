<?php

declare(strict_types=1);

namespace CelebHair\Providers;

use CelebHair\Config;

final class ProviderFactory
{
    /**
     * PROVIDER=gemini|openai|demo. When unset, picks whichever API key is present, else demo.
     */
    public static function make(): HairProvider
    {
        $geminiKey = Config::get('GEMINI_API_KEY');
        $openaiKey = Config::get('OPENAI_API_KEY');

        $choice = strtolower(Config::get('PROVIDER'));
        if ($choice === '') {
            $choice = $geminiKey !== '' ? 'gemini' : ($openaiKey !== '' ? 'openai' : 'demo');
        }

        return match ($choice) {
            'gemini' => $geminiKey !== ''
                ? new GeminiProvider($geminiKey, Config::get('GEMINI_MODEL', 'gemini-2.5-flash-image'))
                : new DemoProvider(),
            'openai' => $openaiKey !== ''
                ? new OpenAIProvider(
                    $openaiKey,
                    Config::get('OPENAI_MODEL', 'gpt-image-1'),
                    Config::get('OPENAI_INPUT_FIDELITY', 'high'),
                    Config::get('OPENAI_QUALITY', 'medium'),
                )
                : new DemoProvider(),
            default => new DemoProvider(),
        };
    }
}
