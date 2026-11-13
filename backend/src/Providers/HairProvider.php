<?php

declare(strict_types=1);

namespace CelebHair\Providers;

use CelebHair\UploadedImage;

interface HairProvider
{
    public function name(): string;

    /**
     * @return array{bytes: string, mimeType: string}
     */
    public function tryOn(UploadedImage $selfie, UploadedImage $inspiration, string $prompt): array;
}
