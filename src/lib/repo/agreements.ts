import { run, get, newId, nowIso } from "@/lib/db/client";

interface AgreementAcceptanceDbRow {
  id: string;
  client_id: string;
  agreement_version: string;
  accepted_name: string;
  accepted_at: string;
  ip_address: string | null;
}

export interface AgreementAcceptanceRow {
  id: string;
  clientId: string;
  agreementVersion: string;
  acceptedName: string;
  acceptedAt: string;
  ipAddress: string | null;
}

function fromRow(row: AgreementAcceptanceDbRow): AgreementAcceptanceRow {
  return {
    id: row.id,
    clientId: row.client_id,
    agreementVersion: row.agreement_version,
    acceptedName: row.accepted_name,
    acceptedAt: row.accepted_at,
    ipAddress: row.ip_address,
  };
}

export async function findAgreementAcceptanceByClientId(clientId: string): Promise<AgreementAcceptanceRow | undefined> {
  const row = await get<AgreementAcceptanceDbRow>("SELECT * FROM agreement_acceptances WHERE client_id = $clientId", {
    $clientId: clientId,
  });
  return row ? fromRow(row) : undefined;
}

// Clickwrap acceptance: typed full name + checkbox, recorded with version,
// timestamp, and IP (§17). Idempotent — re-accepting (e.g. the client
// revisits the link) just overwrites the record with the latest values
// rather than erroring.
export async function recordAgreementAcceptance(params: {
  clientId: string;
  agreementVersion: string;
  acceptedName: string;
  ipAddress: string | null;
}): Promise<AgreementAcceptanceRow> {
  const existing = await findAgreementAcceptanceByClientId(params.clientId);
  if (existing) {
    await run(
      `UPDATE agreement_acceptances
       SET agreement_version = $version, accepted_name = $name, accepted_at = $now, ip_address = $ip
       WHERE client_id = $clientId`,
      {
        $clientId: params.clientId,
        $version: params.agreementVersion,
        $name: params.acceptedName,
        $ip: params.ipAddress,
        $now: nowIso(),
      }
    );
    return (await findAgreementAcceptanceByClientId(params.clientId))!;
  }

  const id = newId();
  await run(
    `INSERT INTO agreement_acceptances (id, client_id, agreement_version, accepted_name, accepted_at, ip_address)
     VALUES ($id, $clientId, $version, $name, $now, $ip)`,
    {
      $id: id,
      $clientId: params.clientId,
      $version: params.agreementVersion,
      $name: params.acceptedName,
      $ip: params.ipAddress,
      $now: nowIso(),
    }
  );
  return (await findAgreementAcceptanceByClientId(params.clientId))!;
}
