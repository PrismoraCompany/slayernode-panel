<?php

namespace SlayerNode\Services\Addons;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Cache;
use SlayerNode\Models\Server;
use SlayerNode\Repositories\Wings\DaemonFileRepository;

class ModrinthCurseForgeService
{
    protected Client $httpClient;
    protected DaemonFileRepository $fileRepository;

    public function __construct(DaemonFileRepository $fileRepository)
    {
        $this->httpClient = new Client(['timeout' => 15]);
        $this->fileRepository = $fileRepository;
    }

    /**
     * Search Modrinth for plugins/mods compatible with server loader and version.
     */
    public function searchModrinth(string $query, array $loaders = ['paper', 'purpur'], string $gameVersion = '1.21.4'): array
    {
        $cacheKey = "modrinth_search:" . md5($query . implode(',', $loaders) . $gameVersion);

        return Cache::remember($cacheKey, 3600, function () use ($query, $loaders, $gameVersion) {
            $facets = [
                array_map(fn($l) => "categories:{$l}", $loaders),
                ["versions:{$gameVersion}"],
            ];

            $response = $this->httpClient->get('https://api.modrinth.com/v2/search', [
                'query' => [
                    'query' => $query,
                    'facets' => json_encode($facets),
                    'limit' => 20,
                ],
                'headers' => [
                    'User-Agent' => 'SlayerNodePanel/1.0 (contact@slayernode.xyz)',
                ],
            ]);

            return json_decode($response->getBody()->getContents(), true)['hits'] ?? [];
        });
    }

    /**
     * Download and install plugin jar directly into server /plugins directory via Wings.
     */
    public function installModrinthVersion(Server $server, string $versionId): bool
    {
        $versionInfo = $this->httpClient->get("https://api.modrinth.com/v2/version/{$versionId}");
        $data = json_decode($versionInfo->getBody()->getContents(), true);

        if (empty($data['files'])) {
            throw new \Exception('No downloadable jar file found for this version.');
        }

        $primaryFile = $data['files'][0];
        $downloadUrl = $primaryFile['url'];
        $filename = $primaryFile['filename'];

        // Pull remote download into server /plugins directory via Wings Remote API
        $this->fileRepository->setServer($server)->pull(
            $downloadUrl,
            '/plugins',
            $filename
        );

        return true;
    }
}
