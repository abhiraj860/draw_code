import { Activity, AppWindow, Archive, ArrowLeftRight, Bell, Box, Brain, CalendarClock, ChartLine, Cloud, Cog, Container, Copy, Cpu, CreditCard, Database, Folder, Gauge, Globe, Inbox, KeyRound, Layers, LayoutDashboard, Lock, Mail, Map as MapIcon, MemoryStick, Network, Plug, Radio, Router, ScrollText, Search, Server, Settings2, ShieldCheck, Signpost, Smartphone, Split, SquareDashed, SquareFunction, StickyNote, User, Warehouse, Waves, Webhook, Workflow } from "lucide-static";

/** How a palette item is drawn on the canvas. */
export type ComponentKind = "node" | "boundary" | "note";

export type ComponentDef = {
  id: string;
  label: string;
  icon: string; // SVG markup
  kind: ComponentKind;
  keywords?: string; // extra words for palette search
};

export type Category = {
  id: string;
  label: string;
  stroke: string; // shape outline and icon color
  fill: string; // shape background
  uiColor: { light: string; dark: string }; // icon color in the palette
  items: ComponentDef[];
};

const node = (id: string, label: string, icon: string, keywords = ""): ComponentDef => ({
  id,
  label,
  icon,
  kind: "node",
  keywords,
});

export const CATEGORIES: Category[] = [
  {
    id: "clients",
    label: "Clients",
    stroke: "#1971c2",
    fill: "#d0ebff",
    uiColor: { light: "#1971c2", dark: "#74c0fc" },
    items: [
      node("user", "User", User, "person actor customer"),
      node("web-app", "Web App", AppWindow, "browser frontend spa client"),
      node("mobile-app", "Mobile App", Smartphone, "ios android phone client"),
      node("admin-dashboard", "Admin Dashboard", LayoutDashboard, "backoffice console"),
      node("iot-device", "IoT Device", Cpu, "sensor embedded"),
    ],
  },
  {
    id: "edge",
    label: "Edge & Networking",
    stroke: "#6741d9",
    fill: "#e5dbff",
    uiColor: { light: "#6741d9", dark: "#b197fc" },
    items: [
      node("dns", "DNS", Signpost, "route53 domain name"),
      node("cdn", "CDN", Globe, "cloudfront edge cache static akamai"),
      node("load-balancer", "Load Balancer", Split, "lb alb elb nginx haproxy"),
      node("api-gateway", "API Gateway", Router, "gateway kong apigee edge"),
      node("reverse-proxy", "Reverse Proxy", ArrowLeftRight, "nginx envoy proxy"),
      node("firewall", "Firewall / WAF", ShieldCheck, "waf security"),
      node("rate-limiter", "Rate Limiter", Gauge, "throttle token bucket"),
    ],
  },
  {
    id: "compute",
    label: "Compute",
    stroke: "#2f9e44",
    fill: "#d3f9d8",
    uiColor: { light: "#2f9e44", dark: "#8ce99a" },
    items: [
      node("api-server", "API Server", Server, "backend web server app server rest"),
      node("microservice", "Microservice", Box, "service"),
      node("serverless", "Serverless Function", SquareFunction, "lambda cloud function faas"),
      node("worker", "Worker", Cog, "background job consumer"),
      node("container-cluster", "Container Cluster", Container, "kubernetes k8s docker ecs"),
      node("scheduler", "Scheduler / Cron", CalendarClock, "cron job timer"),
      node("workflow", "Workflow Engine", Workflow, "orchestrator temporal airflow step functions"),
    ],
  },
  {
    id: "data",
    label: "Data & Storage",
    stroke: "#e8590c",
    fill: "#ffe8cc",
    uiColor: { light: "#e8590c", dark: "#ffa94d" },
    items: [
      node("sql-db", "SQL Database", Database, "postgres mysql relational rdbms"),
      node("nosql-db", "NoSQL Database", Layers, "mongodb dynamodb cassandra document"),
      node("cache", "Cache", MemoryStick, "redis memcached in-memory"),
      node("read-replica", "Read Replica", Copy, "replica follower secondary"),
      node("object-storage", "Object Storage", Archive, "s3 blob gcs files"),
      node("search-index", "Search Index", Search, "elasticsearch opensearch solr"),
      node("data-warehouse", "Data Warehouse", Warehouse, "snowflake bigquery redshift analytics"),
      node("file-system", "File System", Folder, "nfs disk volume"),
    ],
  },
  {
    id: "messaging",
    label: "Messaging",
    stroke: "#c2255c",
    fill: "#ffdeeb",
    uiColor: { light: "#c2255c", dark: "#f783ac" },
    items: [
      node("message-queue", "Message Queue", Inbox, "sqs rabbitmq queue"),
      node("pub-sub", "Pub/Sub Topic", Radio, "sns topic broadcast fanout"),
      node("event-stream", "Event Stream", Waves, "kafka kinesis log stream"),
      node("webhook", "Webhook", Webhook, "callback http event"),
    ],
  },
  {
    id: "services",
    label: "Common Services",
    stroke: "#0c8599",
    fill: "#c5f6fa",
    uiColor: { light: "#0c8599", dark: "#66d9e8" },
    items: [
      node("auth", "Auth Service", KeyRound, "login identity oauth jwt sso"),
      node("notification", "Notification Service", Bell, "push alert"),
      node("email", "Email Service", Mail, "smtp ses sendgrid"),
      node("payment", "Payment Service", CreditCard, "stripe billing checkout"),
      node("ml-model", "ML Model", Brain, "ai inference recommendation"),
      node("secrets", "Secrets Manager", Lock, "vault kms keys"),
      node("config", "Config Service", Settings2, "feature flags settings"),
    ],
  },
  {
    id: "observability",
    label: "Observability",
    stroke: "#5c940d",
    fill: "#e9fac8",
    uiColor: { light: "#5c940d", dark: "#c0eb75" },
    items: [
      node("monitoring", "Monitoring", Activity, "metrics prometheus grafana datadog"),
      node("logging", "Logging", ScrollText, "logs elk loki"),
      node("analytics", "Analytics", ChartLine, "dashboards bi events"),
    ],
  },
  {
    id: "external",
    label: "External",
    stroke: "#495057",
    fill: "#e9ecef",
    uiColor: { light: "#495057", dark: "#ced4da" },
    items: [
      node("third-party-api", "Third-party API", Plug, "external integration vendor"),
      node("cloud-service", "Cloud Service", Cloud, "saas managed aws gcp azure"),
    ],
  },
  {
    id: "layout",
    label: "Boundaries & Notes",
    stroke: "#868e96",
    fill: "transparent",
    uiColor: { light: "#495057", dark: "#ced4da" },
    items: [
      { id: "region", label: "Region", icon: MapIcon, kind: "boundary", keywords: "area zone geography" },
      { id: "vpc", label: "VPC / Network", icon: Network, kind: "boundary", keywords: "private network" },
      { id: "availability-zone", label: "Availability Zone", icon: SquareDashed, kind: "boundary", keywords: "az datacenter" },
      { id: "subnet", label: "Subnet", icon: SquareDashed, kind: "boundary", keywords: "private public" },
      { id: "group", label: "Group", icon: SquareDashed, kind: "boundary", keywords: "box container service boundary" },
      { id: "note", label: "Note", icon: StickyNote, kind: "note", keywords: "comment requirement sticky text" },
    ],
  },
];

export const COMPONENTS = new Map(
  CATEGORIES.flatMap((category) => category.items.map((def) => [def.id, { def, category }] as const)),
);
