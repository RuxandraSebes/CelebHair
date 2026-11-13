<?php

declare(strict_types=1);

namespace CelebHair\Providers;

use CelebHair\HttpError;

final class HttpClient
{
    /**
     * @param list<string> $headers
     * @return array<string, mixed> decoded JSON body
     */
    public static function post(string $url, string $body, array $headers, string $providerName): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 180,
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            throw new HttpError(502, "Could not reach {$providerName}: {$curlError}");
        }

        $json = json_decode((string) $raw, true);
        if ($status >= 400) {
            $message = is_array($json) ? ($json['error']['message'] ?? null) : null;
            error_log("[{$providerName}] HTTP {$status}: " . substr((string) $raw, 0, 2000));
            if ($status === 429) {
                $hint = str_contains((string) $message, 'free_tier')
                    ? 'image generation is not included in the free tier, so enable billing for this API key\'s project.'
                    : 'too many requests or quota used up. Wait a bit, or check your plan and billing.';
                throw new HttpError(429, "{$providerName} quota exceeded: {$hint}");
            }
            $firstLine = strtok((string) ($message ?? "HTTP {$status}"), "\n");
            throw new HttpError(502, "{$providerName} returned an error: " . mb_strimwidth((string) $firstLine, 0, 300, '…'));
        }
        if (!is_array($json)) {
            throw new HttpError(502, "{$providerName} returned an unreadable response.");
        }

        return $json;
    }
}
