import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL RLS enforces consent, attribution, revocation and private deletion", async () => {
  const db = new PGlite();
  await db.exec(`create schema auth;create table auth.users(id uuid primary key,email text);create role authenticated;create role anon;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email',current_setting('request.jwt.claim.email',true))$$;
 grant usage on schema auth,public to authenticated;grant execute on all functions in schema auth to authenticated;`);
  await db.exec(
    readFileSync("supabase/migrations/001_careplate.sql", "utf8").replace(
      "create extension if not exists pgcrypto;",
      "",
    ),
  );
  await db.exec(`grant select,insert,update,delete on all tables in schema public to authenticated;
 insert into auth.users values ('00000000-0000-4000-8000-000000000001','senior@example.com'),('00000000-0000-4000-8000-000000000002','care@example.com'),('00000000-0000-4000-8000-000000000003','stranger@example.com');`);
  const senior = "00000000-0000-4000-8000-000000000001",
    care = "00000000-0000-4000-8000-000000000002",
    stranger = "00000000-0000-4000-8000-000000000003";
  const asUser = async (id: string, email: string) => {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.email',$2,false)",
      [id, email],
    );
    await db.exec("set role authenticated");
  };
  await asUser(senior, "senior@example.com");
  await db.query(
    `insert into glucose_readings(owner_id,created_by,value,unit,context,recorded_at) values($1,$1,118,'mg/dL','fasting',now())`,
    [senior],
  );
  await db.query(`select care_invite('care@example.com')`);
  const invite = (
    await db.query<{ id: string }>("select id from caregiver_permissions")
  ).rows[0].id;
  await asUser(care, "care@example.com");
  assert.equal(
    (await db.query("select * from glucose_readings")).rows.length,
    0,
    "pending invitation grants no access",
  );
  await db.query("select care_accept($1)", [invite]);
  assert.equal(
    (await db.query("select * from glucose_readings")).rows.length,
    1,
    "accepted caregiver can read",
  );
  await db.query(
    `insert into blood_pressure_readings(owner_id,created_by,systolic,diastolic,pulse,recorded_at) values($1,$2,124,78,72,now())`,
    [senior, care],
  );
  await assert.rejects(
    db.query(
      `insert into glucose_readings(owner_id,created_by,value,unit,context,recorded_at) values($1,$1,118,'mg/dL','fasting',now())`,
      [senior],
    ),
    /row-level security/,
    "caregiver cannot impersonate senior",
  );
  await db.query("select delete_my_records()");
  assert.equal(
    (await db.query("select * from glucose_readings")).rows.length,
    1,
    "caregiver deletion cannot delete senior data",
  );
  await asUser(stranger, "stranger@example.com");
  assert.equal(
    (await db.query("select * from glucose_readings")).rows.length,
    0,
  );
  await assert.rejects(
    db.query("select care_accept($1)", [invite]),
    /unavailable/,
  );
  await asUser(senior, "senior@example.com");
  assert.equal(
    (await db.query("select * from audit_log")).rows.length,
    4,
    "reading, invite, accept, caregiver reading audited",
  );
  await db.query("select care_revoke($1)", [invite]);
  await asUser(care, "care@example.com");
  assert.equal(
    (await db.query("select * from glucose_readings")).rows.length,
    0,
    "revocation takes effect in database",
  );
  await assert.rejects(
    db.query(
      `insert into blood_pressure_readings(owner_id,created_by,systolic,diastolic,pulse,recorded_at) values($1,$2,124,78,72,now())`,
      [senior, care],
    ),
    /row-level security/,
  );
  await asUser(senior, "senior@example.com");
  await assert.rejects(
    db.query(
      `insert into clinician_settings(owner_id,clinician_reference,verified_at) values($1,'unverified',now())`,
      [senior],
    ),
    /row-level security/,
  );
  await db.query("select delete_my_records()");
  assert.equal(
    (await db.query("select * from glucose_readings")).rows.length,
    0,
  );
  await db.close();
});
