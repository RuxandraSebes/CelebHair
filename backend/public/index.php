<?php

declare(strict_types=1);

use CelebHair\Config;
use CelebHair\HttpError;
use CelebHair\Providers\ProviderFactory;
use CelebHair\TryOnPrompt;
use CelebHair\UploadedImage;

require dirname(__DIR__) . '/src/bootstrap.php';

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (!str_starts_with($path, '/api/')) {
    serveFrontend($path);
    exit;
}

try {
    match (true) {
        $method === 'GET' && $path === '/api/health' => health(),
        $method === 'POST' && $path === '/api/try-on' => tryOn(),
        default => throw new HttpError(404, 'Not found'),
    };
} catch (HttpError $e) {
    sendJson(['error' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
    error_log((string) $e);
    sendJson(['error' => 'Something went wrong on the server.'], 500);
}

function health(): void
{
    $provider = ProviderFactory::make();
    sendJson([
        'provider' => $provider->name(),
        'demo' => $provider instanceof CelebHair\Providers\DemoProvider,
        'maxUploadMb' => (int) Config::get('MAX_UPLOAD_MB', '10'),
    ]);
}

function tryOn(): void
{
    // An empty $_FILES on a POST usually means the body exceeded post_max_size.
    if ($_FILES === [] && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        throw new HttpError(413, 'Upload too large for the server (check post_max_size).');
    }

    $selfie = UploadedImage::fromUpload('selfie');
    $inspiration = UploadedImage::fromUpload('inspiration');
    $keepColor = ($_POST['keepColor'] ?? '0') === '1';
    $notes = (string) ($_POST['notes'] ?? '');

    set_time_limit(240);
    $provider = ProviderFactory::make();
    $started = microtime(true);
    $result = $provider->tryOn($selfie, $inspiration, TryOnPrompt::build($keepColor, $notes));

    sendJson([
        'image' => 'data:' . $result['mimeType'] . ';base64,' . base64_encode($result['bytes']),
        'provider' => $provider->name(),
        'ms' => (int) round((microtime(true) - $started) * 1000),
    ]);
}

/** @param array<string, mixed> $data */
function sendJson(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
}

/** Serves the production build (frontend/dist) so one PHP server can host the whole app. */
function serveFrontend(string $path): void
{
    $dist = realpath(Config::get('FRONTEND_DIST', dirname(__DIR__, 2) . '/frontend/dist'));
    if ($dist === false) {
        http_response_code(404);
        header('Content-Type: text/plain');
        echo "Frontend not built. Run `npm run dev` in frontend/ for development, or `npm run build` to serve it from here.";
        return;
    }

    $file = realpath($dist . '/' . ltrim(rawurldecode($path), '/'));
    if ($file === false || !is_file($file) || !str_starts_with($file, $dist . DIRECTORY_SEPARATOR)) {
        $file = $dist . '/index.html';
    }

    $types = [
        'html' => 'text/html; charset=utf-8', 'js' => 'text/javascript', 'css' => 'text/css',
        'svg' => 'image/svg+xml', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'webp' => 'image/webp',
        'ico' => 'image/x-icon', 'json' => 'application/json', 'woff2' => 'font/woff2',
    ];
    header('Content-Type: ' . ($types[pathinfo($file, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
    readfile($file);
}
