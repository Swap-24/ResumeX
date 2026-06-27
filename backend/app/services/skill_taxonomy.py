"""
Skill Taxonomy Graph
====================
400+ tech skills organized into 13 domain clusters with adjacency relationships.
Enables graph-distance-based affinity scoring: same skill -> 1.0, same cluster -> 0.8,
adjacent cluster -> 0.5, 2-hop -> 0.25, unrelated -> 0.05.
"""
from __future__ import annotations
import re

CLUSTERS: dict[str, dict] = {
    "nlp": {
        "label": "NLP & Language Models",
        "members": [
            "nlp", "natural language processing", "text classification", "named entity recognition",
            "ner", "relation extraction", "question answering", "qa", "summarization",
            "text summarization", "machine translation", "sentiment analysis", "topic modeling",
            "text generation", "dialogue systems", "conversational ai",
            "bert", "roberta", "gpt", "gpt-2", "gpt-3", "gpt-4", "llm", "large language model",
            "language model", "transformers", "hugging face", "huggingface", "spacy", "nltk",
            "tokenization", "word2vec", "glove", "fasttext", "elmo", "t5", "bart",
            "mistral", "llama", "llama2", "llama3", "gemini", "claude", "palm",
            "phi", "mixtral", "qwen", "falcon", "openai", "anthropic",
        ],
        "adjacent": ["embeddings", "deep_learning", "fine_tuning", "rag"],
    },
    "embeddings": {
        "label": "Embeddings & Semantic Search",
        "members": [
            "embeddings", "vector embeddings", "sentence embeddings", "text embeddings",
            "semantic search", "semantic similarity", "dense retrieval", "bi-encoder",
            "cross-encoder", "reranking", "e5", "bge", "openai embeddings", "cohere embeddings",
            "sentence-transformers", "sentence transformers", "mpnet", "minilm", "all-minilm",
            "contrastive learning", "siamese networks", "embedding models", "text2vec",
            "instructor", "gte", "jina embeddings",
        ],
        "adjacent": ["nlp", "vector_search", "ranking", "rag"],
    },
    "vector_search": {
        "label": "Vector Databases & ANN Search",
        "members": [
            "pinecone", "qdrant", "milvus", "weaviate", "chroma", "chromadb", "faiss",
            "elasticsearch", "opensearch", "vector database", "vector store", "vector db",
            "approximate nearest neighbor", "ann", "hnsw", "ivf", "ivfpq", "pgvector",
            "redis vector", "typesense", "vald", "vespa", "marqo", "lancedb",
            "zilliz", "turbopuffer",
        ],
        "adjacent": ["embeddings", "ranking", "infra", "rag"],
    },
    "rag": {
        "label": "RAG & Retrieval Pipelines",
        "members": [
            "rag", "retrieval augmented generation", "retrieval", "document retrieval",
            "langchain", "llamaindex", "llama-index", "haystack", "knowledge base",
            "chunking", "hybrid search", "bm25", "sparse retrieval",
            "graphrag", "corrective rag", "self-rag", "agentic rag",
            "rerank", "contextual compression", "multi-vector retrieval",
        ],
        "adjacent": ["nlp", "embeddings", "vector_search", "fine_tuning"],
    },
    "fine_tuning": {
        "label": "Model Fine-tuning & Alignment",
        "members": [
            "fine-tuning", "finetuning", "fine tuning", "lora", "qlora", "peft",
            "rlhf", "reinforcement learning from human feedback", "dpo",
            "direct preference optimization", "instruction tuning", "adapter",
            "prompt tuning", "prefix tuning", "quantization", "gguf", "ggml",
            "bitsandbytes", "gptq", "awq", "supervised fine-tuning", "sft",
            "parameter efficient", "full fine-tuning", "domain adaptation",
        ],
        "adjacent": ["nlp", "deep_learning", "mlops"],
    },
    "ranking": {
        "label": "Ranking, Retrieval & Recommendation",
        "members": [
            "learning to rank", "learning-to-rank", "ltr", "ndcg", "mrr", "map",
            "precision@k", "recall@k", "lambdamart", "ranknet", "listwise",
            "pairwise", "pointwise", "xgboost ranking", "lgbm ranking",
            "ranking", "recommendation system", "recommender",
            "collaborative filtering", "content-based filtering", "matrix factorization",
            "als", "bpr", "candidate retrieval", "two-tower", "dual encoder", "item2vec",
            "youtube dnn", "wide and deep", "deepfm",
        ],
        "adjacent": ["ml", "embeddings", "vector_search", "deep_learning"],
    },
    "ml": {
        "label": "Classical Machine Learning",
        "members": [
            "machine learning", "scikit-learn", "sklearn", "xgboost", "lightgbm",
            "catboost", "random forest", "gradient boosting", "gbm", "decision tree",
            "svm", "support vector machine", "logistic regression", "linear regression",
            "feature engineering", "feature selection", "model evaluation", "cross-validation",
            "hyperparameter tuning", "optuna", "hyperopt", "automl", "bayesian optimization",
            "ensemble methods", "bagging", "boosting", "stacking", "blending",
            "anomaly detection", "clustering", "k-means", "dbscan", "pca",
            "dimensionality reduction", "tsne", "umap", "shap", "lime",
        ],
        "adjacent": ["deep_learning", "data", "mlops", "ranking"],
    },
    "deep_learning": {
        "label": "Deep Learning & Neural Networks",
        "members": [
            "deep learning", "neural network", "pytorch", "tensorflow", "keras", "jax",
            "flax", "cnn", "convolutional neural network", "rnn", "recurrent neural network",
            "lstm", "gru", "attention mechanism", "self-attention", "multi-head attention",
            "transformer architecture", "resnet", "vgg", "efficientnet", "vit",
            "vision transformer", "yolo", "object detection", "image segmentation",
            "diffusion model", "stable diffusion", "gans", "generative adversarial network",
            "vae", "variational autoencoder", "graph neural network", "gnn", "gcn",
            "reinforcement learning", "rl", "dqn", "ppo", "a3c", "sac",
            "multi-modal", "clip", "multimodal",
        ],
        "adjacent": ["ml", "nlp", "fine_tuning", "mlops"],
    },
    "mlops": {
        "label": "MLOps & Model Lifecycle",
        "members": [
            "mlflow", "mlops", "wandb", "weights and biases", "weights & biases", "dvc",
            "bentoml", "torchserve", "triton inference server", "triton", "ray", "ray serve",
            "kubeflow", "sagemaker pipelines", "vertex pipelines", "experiment tracking",
            "model registry", "model serving", "model monitoring", "data drift",
            "concept drift", "a/b testing", "shadow deployment", "canary deployment",
            "feature store", "feast", "tecton", "model compression", "knowledge distillation",
            "onnx", "tensorrt", "tflite", "openvino", "vllm", "text-generation-inference",
        ],
        "adjacent": ["ml", "deep_learning", "cloud", "infra", "fine_tuning"],
    },
    "data": {
        "label": "Data Engineering & Analytics",
        "members": [
            "sql", "postgresql", "mysql", "sqlite", "mariadb", "apache spark", "spark",
            "pyspark", "kafka", "apache kafka", "flink", "apache flink", "dbt",
            "snowflake", "bigquery", "redshift", "databricks", "delta lake",
            "apache iceberg", "apache hudi", "airflow", "apache airflow", "luigi",
            "prefect", "dagster", "data pipeline", "etl", "elt",
            "data warehouse", "data lake", "data lakehouse", "data modeling",
            "pandas", "numpy", "polars", "dask", "data quality", "great expectations",
            "trino", "presto", "hive",
        ],
        "adjacent": ["ml", "cloud", "infra", "backend"],
    },
    "cloud": {
        "label": "Cloud Platforms & Services",
        "members": [
            "aws", "amazon web services", "gcp", "google cloud platform",
            "google cloud", "azure", "microsoft azure", "sagemaker", "vertex ai",
            "azure ml", "ec2", "s3", "lambda", "cloud functions", "cloud run",
            "ecs", "eks", "gke", "aks", "fargate", "cloudformation", "cdk",
            "pulumi", "cloud storage", "rds", "dynamodb", "firestore", "cosmos db",
            "cloud spanner", "azure synapse", "emr", "glue", "athena",
        ],
        "adjacent": ["infra", "mlops", "data", "backend"],
    },
    "infra": {
        "label": "Infrastructure & DevOps",
        "members": [
            "docker", "kubernetes", "k8s", "terraform", "helm", "ansible", "ci/cd",
            "github actions", "jenkins", "gitlab ci", "circleci", "argocd",
            "linux", "bash", "shell scripting", "nginx", "istio", "service mesh",
            "microservices", "grpc", "rest api", "message queue", "rabbitmq",
            "redis", "celery", "prometheus", "grafana", "observability",
            "opentelemetry", "jaeger", "elk stack", "kibana", "datadog",
        ],
        "adjacent": ["cloud", "backend", "mlops", "data"],
    },
    "backend": {
        "label": "Backend & Systems Engineering",
        "members": [
            "python", "fastapi", "flask", "django", "starlette", "java",
            "spring boot", "spring", "golang", "go", "rust", "node.js", "nodejs",
            "express", "nestjs", "typescript", "javascript", "c++", "c#", ".net",
            "scala", "kotlin", "api design", "rest", "graphql", "websockets",
            "system design", "distributed systems", "scalability", "high availability",
            "caching", "rate limiting", "database design", "orm", "sqlalchemy", "prisma",
            "concurrency", "async", "asyncio",
        ],
        "adjacent": ["infra", "data", "cloud", "frontend"],
    },
    "frontend": {
        "label": "Frontend & Web Development",
        "members": [
            "frontend", "react", "react.js", "reactjs", "vue", "vue.js", "vuejs",
            "angular", "angularjs", "next.js", "nextjs", "nuxt", "svelte", "html",
            "html5", "css", "css3", "sass", "scss", "tailwindcss", "tailwind",
            "bootstrap", "jquery", "web development", "ui", "ux", "figma",
            "responsive design", "webpack", "vite", "babel", "npm", "yarn", "pnpm",
        ],
        "adjacent": ["backend"],
    },
}

# --- Build Indexes ---
SKILL_TO_CLUSTER: dict[str, str] = {}
for _cn, _cd in CLUSTERS.items():
    for _skill in _cd["members"]:
        SKILL_TO_CLUSTER[_skill.lower()] = _cn

_ALL_MEMBERS_SORTED = sorted(SKILL_TO_CLUSTER.keys(), key=len, reverse=True)

CLUSTER_ADJACENCY: dict[str, set[str]] = {c: set() for c in CLUSTERS}
for _cn, _cd in CLUSTERS.items():
    for _adj in _cd.get("adjacent", []):
        CLUSTER_ADJACENCY[_cn].add(_adj)
        CLUSTER_ADJACENCY[_adj].add(_cn)

SYNONYMS: dict[str, str] = {
    "torch": "pytorch", "tf": "tensorflow", "sk-learn": "scikit-learn",
    "sklearn": "scikit-learn", "scikit learn": "scikit-learn",
    "hf": "huggingface", "hugging face": "huggingface",
    "llms": "large language model", "llm": "large language model",
    "rag": "retrieval augmented generation", "k8s": "kubernetes",
    "aws sagemaker": "sagemaker", "google vertex": "vertex ai",
    "gpt-4": "gpt", "gpt-3": "gpt", "gpt-3.5": "gpt",
    "gpt4": "gpt", "gpt3": "gpt", "chatgpt": "gpt",
    "bert-base": "bert", "roberta-base": "roberta",
    "sentence transformer": "sentence-transformers",
    "sentence transformers": "sentence-transformers",
    "wb": "wandb", "w&b": "wandb",
    "dl": "deep learning", "elastic search": "elasticsearch",
    "elastic": "elasticsearch", "apache kafka": "kafka",
    "apache spark": "spark", "pyspark": "spark",
    "pg": "postgresql", "postgres": "postgresql",
    "gcp": "google cloud platform", "fine tuning": "fine-tuning",
    "finetuning": "fine-tuning", "fine_tuning": "fine-tuning",
    "vector db": "vector database", "vector store": "vector database",
    "q-lora": "qlora", "lo-ra": "lora",
    "retrieval-augmented generation": "retrieval augmented generation",
    "reactjs": "react", "react.js": "react", "nextjs": "next.js",
    "vuejs": "vue", "vue.js": "vue", "html5": "html", "css3": "css",
    "js": "javascript", "ts": "typescript", "tailwind css": "tailwindcss",
}

def normalize_skill(skill: str) -> str:
    s = skill.lower().strip()
    return SYNONYMS.get(s, s)

def get_cluster(skill: str) -> str | None:
    normalized = normalize_skill(skill)
    if normalized in SKILL_TO_CLUSTER:
        return SKILL_TO_CLUSTER[normalized]
    for member in _ALL_MEMBERS_SORTED:
        if normalized == member or normalized.startswith(member + " ") or member.startswith(normalized + " "):
            return SKILL_TO_CLUSTER[member]
    return None

def cluster_distance(c1: str, c2: str) -> int:
    if c1 == c2: return 0
    if c2 in CLUSTER_ADJACENCY.get(c1, set()): return 1
    for neighbor in CLUSTER_ADJACENCY.get(c1, set()):
        if c2 in CLUSTER_ADJACENCY.get(neighbor, set()): return 2
    return 99

def skill_graph_affinity(skill_a: str, skill_b: str) -> float:
    na = normalize_skill(skill_a)
    nb = normalize_skill(skill_b)
    if na == nb: return 1.0
    if na in nb or nb in na: return 0.9
    ca = get_cluster(skill_a)
    cb = get_cluster(skill_b)
    if ca is None or cb is None:
        try:
            from app.services.embedding_engine import embed, cosine_sim
            ea = embed(na)
            eb = embed(nb)
            sim = cosine_sim(ea, eb)
            if sim > 0.60:
                return round(sim, 2)
        except Exception:
            pass
        return 0.05
    dist = cluster_distance(ca, cb)
    return {0: 0.8, 1: 0.5, 2: 0.25}.get(dist, 0.05)

def match_skills_to_jd(candidate_skills: list[str], jd_skill_terms: list[str]) -> dict:
    if not jd_skill_terms:
        return {"matched": [], "missing": [], "coverage": 0.5}
    matched = []
    missing = []
    for jd_skill in jd_skill_terms:
        best_aff, best_cand = 0.0, None
        for cand_skill in candidate_skills:
            aff = skill_graph_affinity(cand_skill, jd_skill)
            if aff > best_aff:
                best_aff = aff
                best_cand = cand_skill
        if best_aff >= 0.5:
            matched.append((best_cand, jd_skill, round(best_aff, 2)))
        else:
            missing.append(jd_skill)
    coverage = len(matched) / len(jd_skill_terms)
    return {"matched": matched, "missing": missing, "coverage": coverage}

def extract_skills_from_text(text: str) -> list[str]:
    text_lower = text.lower()
    found: set[str] = set()
    for skill in _ALL_MEMBERS_SORTED:
        if re.search(r"\b" + re.escape(skill) + r"\b", text_lower):
            found.add(skill)
    return list(found)
