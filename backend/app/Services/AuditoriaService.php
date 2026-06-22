<?php

namespace App\Services;

use App\Models\Auditoria;
use Illuminate\Support\Facades\Auth;

class AuditoriaService
{
    /**
     * Registra un log de auditoría centralizado.
     *
     * @param  int|null    $userId            ID del usuario (si es null, intentará obtener el usuario autenticado)
     * @param  string      $modulo            Módulo de origen (inventario, ventas, clientes, usuarios, caja, cotizaciones, seguridad)
     * @param  string      $accion            Acción realizada (LOGIN, LOGOUT, CREAR, EDITAR, ELIMINAR, APERTURA, CIERRE, CONFIRMAR, AJUSTE)
     * @param  string      $severidad         Nivel de severidad (info, warning, danger)
     * @param  string      $descripcion       Detalle legible para humanos
     * @param  array|null  $valoresAnteriores Valores previos (opcional)
     * @param  array|null  $valoresNuevos     Valores modificados (opcional)
     * @return Auditoria
     */
    public static function registrar(
        ?int $userId,
        string $modulo,
        string $accion,
        string $severidad,
        string $descripcion,
        ?array $valoresAnteriores = null,
        ?array $valoresNuevos = null
    ): Auditoria {
        // Si no se pasa el userId, se intenta resolver el usuario autenticado
        if (is_null($userId)) {
            $userId = Auth::check() ? Auth::id() : null;
        }

        // Capturar información de la petición HTTP si existe
        $ipAddress = request() ? request()->ip() : null;
        $userAgent = request() ? request()->userAgent() : null;

        return Auditoria::create([
            'user_id'            => $userId,
            'modulo'             => strtolower($modulo),
            'accion'             => strtoupper($accion),
            'severidad'          => strtolower($severidad),
            'descripcion'        => $descripcion,
            'valores_anteriores' => $valoresAnteriores,
            'valores_nuevos'     => $valoresNuevos,
            'ip_address'         => $ipAddress,
            'user_agent'         => $userAgent,
        ]);
    }
}
