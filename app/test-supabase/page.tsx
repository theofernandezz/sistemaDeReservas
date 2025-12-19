import { getServices } from '@/app/actions'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function TestSupabase() {
  const result = await getServices()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-4">
            🧪 Prueba de Conexión Supabase
          </h1>

          <div className="mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'} `} />
              <span className="font-semibold">
                Estado: {result.success ? '✅ Conectado' : '❌ Error'}
              </span>
            </div>
          </div>

          {!result.success ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="font-semibold text-red-900 mb-2">Error de Conexión</h2>
              <p className="text-red-700 text-sm">{result.error}</p>

              <div className="mt-4 text-sm text-gray-700">
                <p className="font-semibold mb-2">Asegúrate de:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Haber creado el archivo <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
                  <li>Incluir <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code></li>
                  <li>Incluir <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                  <li>Haber reiniciado el servidor de desarrollo</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="font-semibold text-green-900 mb-3">
                ✅ Conexión exitosa a Supabase
              </h2>

              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  Se encontraron <strong>{result.data?.length || 0}</strong> servicios activos.
                </p>
              </div>

              {result.data && result.data.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Servicios disponibles:</h3>
                  <div className="space-y-2">
                    {result.data.map(service => (
                      <div
                        key={service.id}
                        className="bg-white border rounded-lg p-3 flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-600">
                            {service.duration_minutes} minutos
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ${service.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!result.data || result.data.length === 0) && (
                <div className="text-sm text-gray-600">
                  <p>No hay servicios activos en la base de datos.</p>
                  <p className="mt-2">
                    Puedes crear servicios usando la Server Action <code className="bg-gray-100 px-1 rounded">createService()</code>.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-2">Siguiente paso:</h3>
            <p className="text-sm text-gray-600">
              Revisa <code className="bg-gray-100 px-1 rounded">docs/INTEGRATION_GUIDE.md</code> para ver ejemplos de cómo usar las Server Actions en tus componentes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
