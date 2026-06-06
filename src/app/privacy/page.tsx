import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = '6 de junio de 2026'

export const metadata = {
  title: 'Política de Privacidad – REGI$TRATIO',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={15} /> Volver al inicio
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Política de Privacidad</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Última actualización: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>1. Responsable del tratamiento</h2>
            <p>REGI$TRATIO es responsable del tratamiento de los datos personales recopilados a través de esta aplicación, en cumplimiento de la Ley N° 25.326 de Protección de Datos Personales de la República Argentina.</p>
            <p className="mt-2">Esta base de datos ha sido inscripta ante la Dirección Nacional de Protección de Datos Personales conforme lo exige la normativa vigente.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>2. Datos que recopilamos</h2>
            <p>Recopilamos únicamente los datos necesarios para prestar el servicio:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li><strong style={{ color: 'var(--text-primary)' }}>Datos de cuenta:</strong> nombre completo y dirección de email, proporcionados al registrarte</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Datos financieros:</strong> movimientos, cuentas, presupuestos y cualquier otra información que vos ingresés voluntariamente</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Datos técnicos:</strong> dirección IP, tipo de dispositivo y navegador, para seguridad y funcionamiento del servicio</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Datos de uso:</strong> funcionalidades utilizadas, para mejorar el producto (nunca se comercializan)</li>
            </ul>
            <p className="mt-2"><strong style={{ color: 'var(--text-primary)' }}>No recopilamos</strong> credenciales bancarias, números de tarjeta ni información de acceso a entidades financieras.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>3. Finalidad del tratamiento</h2>
            <p>Tus datos se utilizan exclusivamente para:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Proveer y mantener el servicio de REGI$TRATIO</li>
              <li>Gestionar tu cuenta y suscripción</li>
              <li>Enviarte notificaciones relacionadas con el servicio (no publicidad de terceros)</li>
              <li>Mejorar la aplicación mediante análisis de uso agregado y anonimizado</li>
              <li>Cumplir obligaciones legales aplicables</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>4. Cómo protegemos tus datos</h2>
            <p>Implementamos medidas técnicas y organizativas para proteger tu información:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Cifrado en tránsito mediante TLS 1.3 (HTTPS)</li>
              <li>Cifrado en reposo mediante AES-256</li>
              <li>Aislamiento de datos por usuario mediante Row Level Security (RLS)</li>
              <li>Acceso restringido a los datos: ningún empleado puede ver tus datos financieros</li>
            </ul>
            <p className="mt-2">Más información en nuestra <Link href="/seguridad" className="underline" style={{ color: 'var(--accent)' }}>página de seguridad</Link>.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>5. Compartir datos con terceros</h2>
            <p>No vendemos, alquilamos ni compartimos tus datos personales con terceros con fines comerciales. Podemos compartir información únicamente con:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li><strong style={{ color: 'var(--text-primary)' }}>Proveedores de infraestructura:</strong> Supabase (base de datos y autenticación) y Vercel (hosting), ambos bajo acuerdos de confidencialidad</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Procesadores de pago:</strong> exclusivamente para gestionar tu suscripción, sin acceso a tus datos financieros</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Autoridades competentes:</strong> cuando sea requerido por ley o resolución judicial</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>6. Retención de datos</h2>
            <p>Conservamos tus datos mientras tu cuenta esté activa. Al eliminar tu cuenta, tus datos serán eliminados de forma permanente dentro de los 30 días siguientes, salvo que exista una obligación legal que requiera su retención por un período mayor.</p>
            <p className="mt-2">Los datos de facturación pueden conservarse por hasta 10 años de conformidad con la legislación fiscal argentina.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>7. Tus derechos (Ley 25.326)</h2>
            <p>Como titular de datos personales, tenés derecho a:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li><strong style={{ color: 'var(--text-primary)' }}>Acceso:</strong> conocer qué datos tenemos sobre vos</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Rectificación:</strong> corregir datos inexactos o incompletos</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Supresión:</strong> solicitar la eliminación de tus datos ("derecho al olvido")</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Confidencialidad:</strong> exigir que tus datos no sean cedidos a terceros no autorizados</li>
            </ul>
            <p className="mt-2">Podés ejercer estos derechos desde la sección Configuración de la app o contactándonos directamente. La DIRECCIÓN NACIONAL DE PROTECCIÓN DE DATOS PERSONALES tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de la Ley 25.326.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>8. Cookies y tecnologías similares</h2>
            <p>REGI$TRATIO utiliza cookies técnicas estrictamente necesarias para el funcionamiento del servicio (autenticación y preferencias de sesión). No utilizamos cookies de seguimiento ni publicidad de terceros.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>9. Modificaciones a esta política</h2>
            <p>Podemos actualizar esta política periódicamente. Notificaremos los cambios significativos por email con al menos 15 días de anticipación. El uso continuado del servicio tras la vigencia de los cambios implica la aceptación de la nueva política.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>10. Contacto</h2>
            <p>Para ejercer tus derechos o realizar consultas sobre esta política, contactanos desde la sección de soporte dentro de la aplicación.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
