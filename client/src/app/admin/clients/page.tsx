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
      <div className="card overflow-x-auto">
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
