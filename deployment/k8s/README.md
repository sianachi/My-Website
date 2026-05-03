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
