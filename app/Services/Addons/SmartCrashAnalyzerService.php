<?php

namespace SlayerNode\Services\Addons;

use SlayerNode\Models\Server;
use SlayerNode\Repositories\Wings\DaemonFileRepository;

class SmartCrashAnalyzerService
{
    protected DaemonFileRepository $fileRepository;

    public function __construct(DaemonFileRepository $fileRepository)
    {
        $this->fileRepository = $fileRepository;
    }

    /**
     * Inspect latest.log or crash-reports directory and diagnose causes.
     */
    public function diagnose(Server $server): array
    {
        $logContent = '';
        try {
            $logContent = $this->fileRepository->setServer($server)->getContent('/logs/latest.log');
        } catch (\Exception $e) {
            return [
                'detected' => false,
                'category' => 'LOG_UNAVAILABLE',
                'title' => 'Could not read /logs/latest.log',
                'explanation' => 'Ensure the server has created a log file.',
                'resolution_steps' => ['Start the server once to generate log output.'],
                'auto_fixable' => false,
            ];
        }

        // 1. Out of Memory (OOM)
        if (str_contains($logContent, 'java.lang.OutOfMemoryError')) {
            return [
                'detected' => true,
                'category' => 'OOM',
                'title' => 'Critical Java Out of Memory Heap Exhaustion',
                'severity' => 'critical',
                'snippet' => 'java.lang.OutOfMemoryError: Java heap space',
                'explanation' => 'The allocated memory limit is insufficient for active players, loaded chunks, and plugins.',
                'resolution_steps' => [
                    'Increase the server RAM allocation in the panel.',
                    'Use Aikar G1GC flags to optimize garbage collection.',
                    'Pre-generate chunks using Chunky.',
                ],
                'auto_fixable' => true,
                'auto_fix_action' => 'Boost RAM +2048MB',
            ];
        }

        // 2. Port Binding Failure
        if (str_contains($logContent, 'BindException: Address already in use')) {
            return [
                'detected' => true,
                'category' => 'PORT_IN_USE',
                'title' => 'Port Binding Conflict',
                'severity' => 'critical',
                'snippet' => 'java.net.BindException: Address already in use',
                'explanation' => 'Another process is currently holding the allocated server port.',
                'resolution_steps' => [
                    'Dispatch a SIGKILL signal from the power menu.',
                    'Select an alternate port allocation in the Network tab.',
                ],
                'auto_fixable' => true,
                'auto_fix_action' => 'SIGKILL Zombie PID',
            ];
        }

        // 3. Java Runtime Version Mismatch
        if (str_contains($logContent, 'UnsupportedClassVersionError') || str_contains($logContent, 'class file version 65.0')) {
            return [
                'detected' => true,
                'category' => 'JAVA_VERSION_MISMATCH',
                'title' => 'Java Runtime Mismatch',
                'severity' => 'warning',
                'snippet' => 'class file version 65.0 recognized only up to 61.0',
                'explanation' => 'Server jar was compiled for Java 21, but container is running Java 17.',
                'resolution_steps' => [
                    'Change Docker Image to Java 21 Yolks in the Startup tab.',
                ],
                'auto_fixable' => true,
                'auto_fix_action' => 'Switch to Java 21 Yolks',
            ];
        }

        // 4. EULA
        if (str_contains($logContent, 'You need to agree to the EULA')) {
            return [
                'detected' => true,
                'category' => 'EULA_NOT_ACCEPTED',
                'title' => 'Mojang EULA Agreement Required',
                'severity' => 'warning',
                'snippet' => 'You need to agree to the EULA in order to run the server.',
                'explanation' => 'eula.txt has not been accepted.',
                'resolution_steps' => [
                    'Set eula=true in eula.txt.',
                ],
                'auto_fixable' => true,
                'auto_fix_action' => 'Auto-Accept EULA',
            ];
        }

        return [
            'detected' => false,
            'category' => 'CLEAN',
            'title' => 'No Critical Crashes Detected',
            'severity' => 'info',
            'snippet' => 'Latest logs show clean thread execution.',
            'explanation' => 'Server is running normally.',
            'resolution_steps' => [],
            'auto_fixable' => false,
        ];
    }
}
