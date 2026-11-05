"use client";

import { useState } from "react";
import { useCustomersQuery } from "@/features/admin/adminApi";
import { formatDate } from "@/lib/format";

// La liste des clients, en lecture seule.
export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data } = useCustomersQuery({ q: q || undefined, page });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Clients</h1>
      <label className="block max-w-md">
        <span className="sr-only">Chercher un client</span>
        <input
          className="input"
          type="search"
          placeholder="Email, nom ou téléphone…"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
        />
      </label>
      {/* Sur téléphone, une carte par client (05/11) ; le tableau revient à partir de 768 px. */}
      <ul className="space-y-2 md:hidden">
        {data?.data.map((customer) => (
          <li key={customer.id} className="card flex items-center gap-3 p-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {customer.firstName} {customer.lastName}
              </span>
              <span className="block truncate text-xs text-ink-muted">{customer.email}</span>
              <span className="block text-xs text-ink-muted">
                {customer.phone} · {customer.addressWilaya ?? "—"} · inscrit le {formatDate(customer.createdAt)}
              </span>
            </span>
            <span className="shrink-0 text-center">
              <span className="block font-bold">{customer._count.orders}</span>
              <span className="text-xs text-ink-muted">cmd.</span>
            </span>
          </li>
        ))}
        {data && data.data.length === 0 ? <li className="card p-6 text-ink-muted">Aucun client.</li> : null}
      </ul>

      <div className="card hidden overflow-x-auto md:block">
        <table className="table min-w-[640px]">
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Téléphone</th>
              <th scope="col">Wilaya</th>
              <th scope="col">Inscrit le</th>
              <th scope="col">Commandes</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <strong>
                    {customer.firstName} {customer.lastName}
                  </strong>
                  <br />
                  <span className="text-ink-muted">{customer.email}</span>
                </td>
                <td>{customer.phone}</td>
                <td>{customer.addressWilaya ?? "—"}</td>
                <td>{formatDate(customer.createdAt)}</td>
                <td>{customer._count.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.data.length === 0 ? <p className="p-6 text-ink-muted">Aucun client.</p> : null}
      </div>
      {data && data.pagination.pages > 1 ? (
        <div className="flex justify-center gap-3">
          <button type="button" className="btn btn-secondary btn-small" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Précédente
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            Suivante
          </button>
        </div>
      ) : null}
    </div>
  );
}
