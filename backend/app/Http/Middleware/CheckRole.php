<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        // Check if the user is authenticated and has one of the required roles
        if (!$request->user() || !in_array($request->user()->role, $roles)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No tienes permisos para acceder a este recurso'
            ], 403);
        }

        return $next($request);
    }
}
