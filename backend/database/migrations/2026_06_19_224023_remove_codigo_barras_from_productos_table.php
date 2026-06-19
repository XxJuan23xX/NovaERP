<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Drop constraints dynamically in SQL Server
        $constraints = DB::select("
            SELECT tc.Constraint_Name
            FROM Information_Schema.Table_Constraints tc
            JOIN Information_Schema.Constraint_Column_Usage ccu 
                ON tc.Constraint_Name = ccu.Constraint_Name
            WHERE tc.Table_Name = 'productos' 
              AND ccu.Column_Name = 'codigo_barras'
        ");

        foreach ($constraints as $c) {
            DB::statement("ALTER TABLE productos DROP CONSTRAINT [" . $c->Constraint_Name . "]");
        }

        // 2. Drop indexes dynamically in SQL Server
        $indexes = DB::select("
            SELECT i.name AS Index_Name
            FROM sys.indexes i
            JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE i.object_id = OBJECT_ID('productos') AND c.name = 'codigo_barras'
        ");

        foreach ($indexes as $idx) {
            DB::statement("DROP INDEX [" . $idx->Index_Name . "] ON productos");
        }

        // 3. Drop column
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('codigo_barras');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->string('codigo_barras', 100)->unique()->nullable()->comment('Código de barras EAN/UPC');
        });
    }
};
