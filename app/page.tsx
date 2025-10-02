export default function Home() {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">GlobalTrip – Formularios</h1>
        <p className="mt-2 text-gray-600">Elegí el flujo que querés usar.</p>
        <ul className="mt-6 list-disc pl-5">
          <li>
            <a className="text-blue-600 underline" href="/checker">
              Checker de productos
            </a>
          </li>
        </ul>
      </main>
    );
  }