export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900">
        Prowider Mini Lead Distribution System
      </h1>
      <p className="text-lg text-gray-600 max-w-xl text-center">
        A backend-heavy lead distribution system using PostgreSQL, Prisma, and
        round-robin allocation with SELECT FOR UPDATE locking.
      </p>
      <div className="flex gap-4 mt-4">
        <a
          href="/request-service"
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Request Service
        </a>
        <a
          href="/dashboard"
          className="px-6 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-medium"
        >
          Dashboard
        </a>
        <a
          href="/test-tools"
          className="px-6 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium"
        >
          Test Tools
        </a>
      </div>
    </div>
  );
}
