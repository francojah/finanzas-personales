import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = '6 de junio de 2026'

export const metadata = {
  title: 'Términos y Condiciones – REGI$TRATIO',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={15} /> Volver al inicio
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Términos y Condiciones</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Última actualización: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>1. Aceptación de los términos</h2>
            <p>Al crear una cuenta en REGI$TRATIO y utilizar el servicio, aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna de las condiciones aquí establecidas, no debés utilizar el servicio.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>2. Descripción del servicio</h2>
            <p>REGI$TRATIO es una herramienta de registro y organización de finanzas personales. Permite a los usuarios ingresar, importar y visualizar sus movimientos financieros de forma manual o mediante archivos CSV, Excel y PDF.</p>
            <p className="mt-2"><strong style={{ color: 'var(--text-primary)' }}>REGI$TRATIO no es una entidad financiera, banco, empresa de inversión ni asesor financiero.</strong> La información mostrada en la plataforma tiene carácter únicamente informativo y organizativo. No constituye asesoramiento financiero, legal ni impositivo.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>3. Registro y cuenta de usuario</h2>
            <p>Para utilizar el servicio debés crear una cuenta proporcionando información veraz y actualizada. Sos responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades que ocurran bajo tu cuenta.</p>
            <p className="mt-2">Debés tener al menos 18 años para utilizar REGI$TRATIO. Al registrarte, declarás que cumplís con este requisito.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>4. Uso aceptable</h2>
            <p>Te comprometés a utilizar REGI$TRATIO únicamente para fines lícitos y de acuerdo con estos términos. Queda prohibido:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Cargar información falsa, fraudulenta o de terceros sin autorización</li>
              <li>Intentar acceder a datos de otros usuarios</li>
              <li>Realizar ingeniería inversa, descompilar o modificar el servicio</li>
              <li>Usar el servicio para actividades ilegales o que violen derechos de terceros</li>
              <li>Sobrecargar intencionalmente la infraestructura del servicio</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>5. Datos financieros y responsabilidad</h2>
            <p>REGI$TRATIO procesa únicamente los datos que vos ingresás. No se conecta a entidades bancarias ni accede a información financiera por canales externos. La exactitud de los datos depende exclusivamente de la información que cargues.</p>
            <p className="mt-2">No asumimos responsabilidad por decisiones financieras tomadas en base a la información visualizada en la plataforma. El servicio no reemplaza la consulta con profesionales en finanzas, contabilidad o derecho.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>6. Planes y pagos</h2>
            <p>REGI$TRATIO ofrece un plan gratuito con funcionalidades limitadas y un plan Premium con acceso completo. Los precios y condiciones del plan Premium están disponibles en la sección de precios de la aplicación.</p>
            <p className="mt-2">Los pagos son procesados por proveedores externos seguros. REGI$TRATIO no almacena datos de tarjetas de crédito. Las suscripciones se renuevan automáticamente salvo que sean canceladas antes del vencimiento del período.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>7. Privacidad y protección de datos</h2>
            <p>El tratamiento de tus datos personales se rige por nuestra <Link href="/privacy" className="underline" style={{ color: 'var(--accent)' }}>Política de Privacidad</Link>, que forma parte integrante de estos términos. Al aceptar estos términos, también aceptás nuestra Política de Privacidad.</p>
            <p className="mt-2">REGI$TRATIO cumple con la Ley N° 25.326 de Protección de Datos Personales de la República Argentina y sus normas complementarias.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>8. Limitación de responsabilidad</h2>
            <p>En la máxima medida permitida por la ley aplicable, REGI$TRATIO no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de usar el servicio, incluyendo pérdidas de datos o decisiones económicas basadas en la información de la plataforma.</p>
            <p className="mt-2">La responsabilidad total de REGI$TRATIO ante cualquier reclamo estará limitada al monto abonado por el usuario en los 12 meses anteriores al evento que dio origen al reclamo.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>9. Modificaciones al servicio y a los términos</h2>
            <p>Nos reservamos el derecho de modificar o discontinuar el servicio, con o sin previo aviso. También podemos actualizar estos términos; en ese caso, notificaremos a los usuarios registrados por email y actualizaremos la fecha de última modificación. El uso continuado del servicio tras una modificación implica la aceptación de los nuevos términos.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>10. Cancelación y eliminación de cuenta</h2>
            <p>Podés cancelar tu cuenta en cualquier momento desde la sección de Configuración. Al eliminar tu cuenta, tus datos personales serán eliminados de forma permanente dentro de los 30 días siguientes, salvo obligación legal de retención.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>11. Ley aplicable y jurisdicción</h2>
            <p>Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia que surja en relación con estos términos o el uso del servicio se someterá a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro fuero o jurisdicción.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>12. Contacto</h2>
            <p>Para consultas relacionadas con estos términos, podés contactarnos a través de la sección de soporte dentro de la aplicación.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
