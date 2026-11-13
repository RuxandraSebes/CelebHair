<?php

declare(strict_types=1);

namespace CelebHair\Providers;

use CelebHair\UploadedImage;

/**
 * Runs without an API key so the app can be tried end to end. It does not change the hair:
 * it returns the selfie with the inspiration photo inset in a corner and a "DEMO" ribbon.
 */
final class DemoProvider implements HairProvider
{
    public function name(): string
    {
        return 'Demo (no AI)';
    }

    public function tryOn(UploadedImage $selfie, UploadedImage $inspiration, string $prompt): array
    {
        usleep(900_000);

        $base = imagecreatefromstring($selfie->bytes);
        $inset = imagecreatefromstring($inspiration->bytes);
        $width = imagesx($base);
        $height = imagesy($base);

        $insetWidth = (int) round($width * 0.3);
        $insetHeight = (int) round(imagesy($inset) * $insetWidth / imagesx($inset));
        $margin = (int) round($width * 0.03);
        $x = $width - $insetWidth - $margin;
        $y = $height - $insetHeight - $margin;

        $white = imagecolorallocate($base, 255, 255, 255);
        imagefilledrectangle($base, $x - 4, $y - 4, $x + $insetWidth + 3, $y + $insetHeight + 3, $white);
        imagecopyresampled($base, $inset, $x, $y, 0, 0, $insetWidth, $insetHeight, imagesx($inset), imagesy($inset));

        $ribbon = imagecolorallocatealpha($base, 30, 20, 20, 40);
        $ribbonHeight = max(28, (int) round($height * 0.06));
        imagefilledrectangle($base, 0, 0, $width, $ribbonHeight, $ribbon);
        imagestring($base, 5, 12, (int) (($ribbonHeight - 15) / 2), 'DEMO MODE - add an API key in backend/.env for real try-ons', $white);

        ob_start();
        imagejpeg($base, null, 90);
        $bytes = (string) ob_get_clean();

        return ['bytes' => $bytes, 'mimeType' => 'image/jpeg'];
    }
}
