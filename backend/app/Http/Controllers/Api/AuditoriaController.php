<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditoriaController extends Controller
{
    /**
     * GET /api/auditoria
     *
     * Listado paginado de logs de auditoría con filtros.
     * Acceso: Administradores.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Auditoria::with('user:id,name,email,role')
            ->orderBy('created_at', 'desc');

        // Filtro: Búsqueda textual (descripción, acción o nombre del usuario)
        if ($busqueda = $request->query('busqueda')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('descripcion', 'like', "%{$busqueda}%")
                  ->orWhere('accion', 'like', "%{$busqueda}%")
                  ->orWhereHas('user', function ($uq) use ($busqueda) {
                      $uq->where('name', 'like', "%{$busqueda}%")
                         ->orWhere('email', 'like', "%{$busqueda}%");
                  });
            });
        }

        // Filtro: Módulo específico
        if ($modulo = $request->query('modulo')) {
            $query->where('modulo', strtolower($modulo));
        }

        // Filtro: Severidad
        if ($severidad = $request->query('severidad')) {
            $query->where('severidad', strtolower($severidad));
        }

        // Filtro: Rango de fechas (fecha_desde / fecha_hasta)
        if ($fechaDesde = $request->query('fecha_desde')) {
            $query->whereDate('created_at', '>=', $fechaDesde);
        }
        if ($fechaHasta = $request->query('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $fechaHasta);
        }

        // Paginación
        $perPage = min($request->integer('per_page', 20), 100);
        $logs = $query->paginate($perPage);

        // Opcional: Generar algunas estadísticas rápidas del total/gravedades
        // Esto servirá para las "cards resumen" del frontend
        $stats = [
            'total_logs' => Auditoria::count(),
            'criticos'   => Auditoria::where('severidad', 'danger')->count(),
            'warnings'   => Auditoria::where('severidad', 'warning')->count(),
            'info'       => Auditoria::where('severidad', 'info')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data'   => $logs,
            'stats'  => $stats,
        ]);
    }
}
