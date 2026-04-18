import { z } from "zod";
import { WorkCardSchema, type WorkCardData } from "./schemas";

const cards: WorkCardData[] = [
  {
    no: "N° 01",
    year: "2022 — 2026 · Redspeed · Production",
    title: "Offence-package <em>Pipeline</em>",
    lede: "Redesigned a legacy offence-package pipeline into a serverless, encrypted routing system processing tens of thousands of submissions per day.",
    meta: [
      { label: "Role", value: "Lead backend engineer" },
      {
        label: "Stack",
        value: ".NET · Azure Functions · Key Vault · Queues · Blob Storage · AES-256",
      },
      {
        label: "Outcome",
        value: "35%+ faster end-to-end; zero key rotations missed in 18 months",
      },
    ],
    notes: [
      "The legacy pipeline was an in-process monolith that held submissions on disk between stages — a throughput ceiling and a compliance risk. Re-architected onto Azure Functions with Queues as the only durable surface, Key Vault for rotation, and a small Blob Storage write-through for the large binary bodies. Every hop signs and encrypts with AES-256 using per-tenant keys.",
    ],
    tags: ["C#", ".NET 8", "Azure Functions", "Key Vault", "AES-256"],
  },
  {
    no: "N° 02",
    year: "2023 — 2025 · Redspeed · Production",
    title: "<em>JAM</em> — Passwordless Auth",
    lede: "Centralised camera-access platform. Passwordless, role-scoped, multi-region — the single auth surface for every camera in the estate.",
    meta: [
      { label: "Role", value: "Backend lead, frontend contributor" },
      {
        label: "Stack",
        value:
          "ASP.NET Core Minimal APIs (REPR) · Microsoft Identity · React · Azure AD B2C",
      },
      {
        label: "Outcome",
        value:
          "Deployed across UK, NZ, Australia, Namibia and further regions. Single pane for operators.",
      },
    ],
    notes: [
      "Built around the REPR pattern so every endpoint has a single request, endpoint, and response type — trivial to test, trivial to reason about. xUnit + TestContainers for the auth paths; end-to-end with Playwright against a live B2C tenant.",
    ],
    tags: [".NET", "React", "Microsoft Identity", "REPR", "Azure AD B2C"],
  },
  {
    no: "N° 03",
    year: "2022 — 2026 · Redspeed · Production",
    title: "Force-format <em>Microservices</em>",
    lede: "Containerised services that transform offence packages into each UK police force's idiosyncratic format. Runs 24/7 without manual intervention.",
    meta: [
      { label: "Role", value: "Architect + implementer (team of 3)" },
      { label: "Stack", value: "Docker · RabbitMQ · C# · .NET · Kubernetes" },
      {
        label: "Outcome",
        value:
          "10+ UK forces live. Tens of thousands of packages / day. Zero manual rescues.",
      },
    ],
    notes: [
      "Each force gets a dedicated transformer service with per-force contract tests. The fleet scales independently on K8s with RabbitMQ as the work queue. A bad format deploy can only take down its own force — blast radius was a primary design constraint.",
    ],
    tags: ["Docker", "RabbitMQ", "C#", "Kubernetes", "Contract tests"],
  },
  {
    no: "N° 04",
    year: "2025 — present · Open Source",
    title: "<em>Jobbie</em> — CV &amp; Application Platform",
    lede: "A modular monolith for CV tailoring and application tracking. Multi-provider AI over SSE, a scraping worker, and a browser extension that pulls jobs into the queue.",
    meta: [
      { label: "Role", value: "Solo" },
      {
        label: "Stack",
        value: ".NET 10 · React 19 · MongoDB · FusionCache + Redis · Terraform",
      },
      {
        label: "AI",
        value:
          "OpenAI · Anthropic · DeepSeek · AWS Bedrock — pluggable, streamed via SSE",
      },
      {
        label: "Scrape",
        value: "Playwright worker · MV3 browser extension",
      },
    ],
    notes: [
      "9+ vertical-slice modules inside a single process — each owns its storage, its endpoints, its tests. Provider abstraction sits in front of every LLM so swapping provider is a config change. Infra is all Terraform; deploys are boring.",
    ],
    tags: [".NET 10", "React 19", "MongoDB", "FusionCache", "Terraform", "MV3"],
  },
  {
    no: "N° 05",
    year: "2024 — present · Open Source",
    title: "<em>MyDevSetup</em> — Ansible Playbook",
    lede: "Cross-platform dev-environment provisioning — same machine every time, whether it's Ubuntu, Fedora/RHEL, or macOS.",
    meta: [
      { label: "Role", value: "Solo" },
      { label: "Stack", value: "Ansible · Docker · GitHub Actions · GHCR" },
      {
        label: "Covers",
        value: "Zsh · Python · Node · Docker · AstroNvim · the usual",
      },
    ],
    notes: [
      "CI runs the playbook inside a fresh Ubuntu 24.04 container on every PR; the resulting image is published to GHCR so anyone can pull the fully-provisioned environment without running the playbook themselves.",
    ],
    tags: ["Ansible", "Docker", "GitHub Actions", "GHCR"],
  },
];

export const WORK_CARDS = z.array(WorkCardSchema).parse(cards);
