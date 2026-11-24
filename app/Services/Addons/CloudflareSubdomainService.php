<?php

namespace SlayerNode\Services\Addons;

use GuzzleHttp\Client;
use SlayerNode\Models\Server;
use SlayerNode\Services\Theme\AppearanceStudioService;

class CloudflareSubdomainService
{
    protected Client $client;
    protected AppearanceStudioService $themeService;

    public function __construct(AppearanceStudioService $themeService)
    {
        $this->themeService = $themeService;
        $this->client = new Client([
            'base_uri' => 'https://api.cloudflare.com/client/v4/',
            'timeout' => 15,
        ]);
    }

    /**
     * Automatically provision Cloudflare A record and Minecraft SRV record.
     */
    public function createSubdomain(Server $server, string $subdomain, string $zoneId, string $domain): array
    {
        $theme = $this->themeService->getActiveTheme();
        $apiToken = $theme['cloudflare_api_token'] ?? null;

        if (!$apiToken) {
            throw new \Exception('Cloudflare API Token is not configured in Admin Appearance Studio.');
        }

        $allocation = $server->allocation;
        $targetIp = $allocation->ip;
        $targetPort = $allocation->port;

        $headers = [
            'Authorization' => "Bearer {$apiToken}",
            'Content-Type' => 'application/json',
        ];

        // 1. Create A Record: direct-subdomain.domain.com -> Server IP
        $aRecordName = "node-{$server->uuidShort}.{$domain}";
        $this->client->post("zones/{$zoneId}/dns_records", [
            'headers' => $headers,
            'json' => [
                'type' => 'A',
                'name' => $aRecordName,
                'content' => $targetIp,
                'ttl' => 120,
                'proxied' => false,
            ],
        ]);

        // 2. Create SRV Record: _minecraft._tcp.subdomain.domain.com -> Port & Host
        $srvName = "_minecraft._tcp.{$subdomain}.{$domain}";
        $response = $this->client->post("zones/{$zoneId}/dns_records", [
            'headers' => $headers,
            'json' => [
                'type' => 'SRV',
                'data' => [
                    'service' => '_minecraft',
                    'proto' => '_tcp',
                    'name' => "{$subdomain}.{$domain}",
                    'priority' => 0,
                    'weight' => 5,
                    'port' => (int) $targetPort,
                    'target' => $aRecordName,
                ],
                'ttl' => 120,
            ],
        ]);

        return [
            'success' => true,
            'full_domain' => "{$subdomain}.{$domain}",
            'target_ip' => $targetIp,
            'target_port' => $targetPort,
        ];
    }
}
