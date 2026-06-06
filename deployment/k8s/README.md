# deployment/k8s

Kubernetes manifests for the portfolio cluster (namespace: `portfolio`).

## Rotating R2 credentials

The mongo + minio backup CronJobs read R2 creds from the `backup-secrets`
k8s secret. To rotate:

1. **Generate a new token** in Cloudflare dashboard → R2 → Manage API Tokens.
   Permissions: **Object Read & Write**, scoped to the `osinachi-backups`
   bucket only. Save the access key + secret somewhere safe — the secret is
   only shown once.

2. **Update `deployment/k8s/backup-secrets.yaml`** (gitignored; copy from
   `backup-secrets.example.yaml` if it doesn't exist locally) with the new
   `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`. `R2_ENDPOINT` and
   `R2_BUCKET` only change if you switch Cloudflare accounts or buckets.

3. **Apply** the secret:
   ```
   kubectl apply -f deployment/k8s/backup-secrets.yaml
   ```
   Running pods don't restart — CronJob pods read the secret fresh on each
   run, so the next scheduled backup will pick up the new values.

4. **Verify** with a manual run before revoking the old token:
   ```
   JOB=mongo-backup-manual-$(date +%s)
   kubectl create job --from=cronjob/mongo-backup $JOB -n portfolio
   kubectl logs -f -n portfolio job/$JOB
   ```
   Expect a `[backup] done: r2/osinachi-backups/mongo/portfolio-<TS>.gz`
   line. Same flow works for `minio-backup`.

5. **Revoke the old token** in Cloudflare once the manual run uploaded
   successfully with the new creds.

## Triggering a manual backup run

Without rotating, just to take an on-demand snapshot:

```
kubectl create job --from=cronjob/mongo-backup mongo-backup-manual-$(date +%s) -n portfolio
kubectl create job --from=cronjob/minio-backup minio-backup-manual-$(date +%s) -n portfolio
```

Successful jobs are pruned automatically by `successfulJobsHistoryLimit`.

## Testing restores

Backups that are never restored aren't backups. Run these end-to-end every
few months — they don't touch production data.

### Mongo

Restores into a throwaway mongo pod, verifies, deletes the pod.

```
# 1. Pick a backup
TS=$(kubectl -n portfolio exec minio-0 -- sh -c '
  mc alias set r2 $(kubectl -n portfolio get secret backup-secrets -o jsonpath={.data.R2_ENDPOINT} | base64 -d) \
                  $(kubectl -n portfolio get secret backup-secrets -o jsonpath={.data.R2_ACCESS_KEY_ID} | base64 -d) \
                  $(kubectl -n portfolio get secret backup-secrets -o jsonpath={.data.R2_SECRET_ACCESS_KEY} | base64 -d) \
                  --api S3v4 >/dev/null
  mc ls r2/osinachi-backups/mongo/ | tail -1 | awk "{print \$NF}"
')
echo "Restoring $TS"

# 2. Spin up a throwaway mongo pod (no auth, ephemeral)
kubectl -n portfolio run mongo-restore-test --image=mongo:7 --restart=Never \
  --command -- sleep 3600
kubectl -n portfolio wait --for=condition=Ready pod/mongo-restore-test --timeout=60s

# 3. Copy backup in via R2 and restore
kubectl -n portfolio exec mongo-restore-test -- bash -c "
  apt-get update -qq && apt-get install -y --no-install-recommends -qq curl ca-certificates >/dev/null
  curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && chmod +x /usr/local/bin/mc
  mc alias set r2 $R2_ENDPOINT $R2_KEY $R2_SECRET --api S3v4 >/dev/null
  mc cp r2/osinachi-backups/mongo/$TS /restore.gz
  mongorestore --archive=/restore.gz --gzip
"

# 4. Verify — counts should match the [backup] output from when this dump ran
kubectl -n portfolio exec mongo-restore-test -- mongosh --quiet --eval '
  db.getMongo().getDBNames().forEach(d => {
    if (["local","config"].includes(d)) return;
    print("DB:", d);
    db.getSiblingDB(d).getCollectionNames().forEach(c => {
      print("  ", c, db.getSiblingDB(d).getCollection(c).countDocuments());
    });
  });
'

# 5. Cleanup
kubectl -n portfolio delete pod mongo-restore-test
```

### MinIO

Mirrors a snapshot back into a temp prefix on the local MinIO and
verifies counts. Doesn't touch the live `portfolio` bucket.

```
TS=20260503T133039Z   # pick a snapshot from `mc ls r2/osinachi-backups/minio/`

kubectl -n portfolio exec minio-0 -- sh -c "
  mc alias set r2 \$(kubectl ...) ... --api S3v4 >/dev/null   # see rotation steps for env loading
  mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD >/dev/null

  # Mirror back into a throwaway bucket prefix
  mc mb --ignore-existing local/restore-test
  mc mirror r2/osinachi-backups/minio/portfolio-${TS}/ local/restore-test/

  # Verify file count
  echo 'Restored objects:' \$(mc ls --recursive local/restore-test/ | wc -l)

  # Spot-check a known file
  mc cat local/restore-test/blog/hello-world/post.md | head -5

  # Cleanup
  mc rb --force local/restore-test
"
```

If counts match what was in the original `[backup] snapshot contains N
objects` log line, the restore path works.
