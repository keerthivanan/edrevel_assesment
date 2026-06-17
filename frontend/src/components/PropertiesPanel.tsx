import { useBuilder, uid } from "../store";
import type { Rule, RuleMetric, RuleOperator } from "../types";

const METRICS_BY_SOURCE: Record<"assessment" | "unit", RuleMetric[]> = {
  assessment: ["completion", "passed", "score", "score_range"],
  unit: ["completion", "time_spent_minutes", "percentage_completion"],
};

const NUMERIC_OPERATORS: RuleOperator[] = ["eq", "ne", "gt", "gte", "lt", "lte"];

function operatorsForMetric(metric: RuleMetric): RuleOperator[] {
  if (metric === "completion" || metric === "passed") return ["eq", "ne"];
  if (metric === "score_range") return ["between"];
  return NUMERIC_OPERATORS;
}

function isBooleanMetric(m: RuleMetric) {
  return m === "completion" || m === "passed";
}

function defaultRuleFor(sourceNodeId: string, sourceType: "assessment" | "unit"): Rule {
  return {
    id: uid("rule"),
    sourceType,
    sourceNodeId,
    metric: METRICS_BY_SOURCE[sourceType][0],
    operator: "eq",
    value: true,
  };
}

export default function PropertiesPanel() {
  const { nodes, edges, selectedNodeId, selectedEdgeId } = useBuilder();
  const updateNode = useBuilder((s) => s.updateNode);
  const updateEdge = useBuilder((s) => s.updateEdge);
  const setEdgeOperator = useBuilder((s) => s.setEdgeOperator);
  const addRule = useBuilder((s) => s.addRule);
  const updateRule = useBuilder((s) => s.updateRule);
  const removeRule = useBuilder((s) => s.removeRule);
  const deleteSelected = useBuilder((s) => s.deleteSelected);

  const node = nodes.find((n) => n.id === selectedNodeId);
  const edge = edges.find((e) => e.id === selectedEdgeId);

  if (!node && !edge) {
    return (
      <aside className="props" aria-label="Properties">
        <div className="props__header">
          <h2>Properties</h2>
        </div>
        <p className="props__empty">Select a node or a connection to edit its properties.</p>
      </aside>
    );
  }

  return (
    <aside className="props" aria-label="Properties">
      <div className="props__header">
        <h2>Properties</h2>
        <button className="btn btn--danger-ghost" onClick={deleteSelected}>
          Delete
        </button>
      </div>

      {node && (
        <div className="props__section">
          <span className={`chip chip--${node.data.nodeType}`}>{node.data.nodeType}</span>

          <label className="field">
            <span>Label</span>
            <input
              value={node.data.label}
              onChange={(e) => updateNode(node.id, { label: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows={3}
              value={node.data.description ?? ""}
              onChange={(e) => updateNode(node.id, { description: e.target.value })}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Duration (min)</span>
              <input
                type="number"
                min={0}
                value={node.data.config?.approximateDurationMinutes ?? 0}
                onChange={(e) =>
                  updateNode(node.id, {
                    config: {
                      ...node.data.config,
                      approximateDurationMinutes: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>

          {node.data.nodeType === "assessment" && (
            <div className="field-row">
              <label className="field">
                <span>Max score</span>
                <input
                  type="number"
                  min={1}
                  value={node.data.config?.assessment?.maxScore ?? 100}
                  onChange={(e) =>
                    updateNode(node.id, {
                      config: {
                        ...node.data.config,
                        assessment: {
                          maxScore: Number(e.target.value),
                          passingScore: node.data.config?.assessment?.passingScore ?? 50,
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Passing score</span>
                <input
                  type="number"
                  min={0}
                  value={node.data.config?.assessment?.passingScore ?? 50}
                  onChange={(e) =>
                    updateNode(node.id, {
                      config: {
                        ...node.data.config,
                        assessment: {
                          maxScore: node.data.config?.assessment?.maxScore ?? 100,
                          passingScore: Number(e.target.value),
                        },
                      },
                    })
                  }
                />
              </label>
            </div>
          )}

          <p className="props__hint">Component: {node.data.componentId}</p>
        </div>
      )}

      {edge && (
        <div className="props__section">
          <p className="props__subtitle">Connection</p>

          <label className="field">
            <span>Label</span>
            <input
              value={typeof edge.label === "string" ? edge.label : ""}
              placeholder="e.g. Score below passing"
              onChange={(e) => updateEdge(edge.id, { label: e.target.value })}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Priority</span>
              <input
                type="number"
                min={1}
                value={edge.data?.priority ?? 1}
                onChange={(e) => updateEdge(edge.id, { priority: Number(e.target.value) })}
              />
            </label>
            <label className="field field--check">
              <input
                type="checkbox"
                checked={!!edge.data?.isDefault}
                onChange={(e) => updateEdge(edge.id, { isDefault: e.target.checked })}
              />
              <span>Default route</span>
            </label>
          </div>

          <div className="conditions">
            <div className="conditions__header">
              <span>Assignment Conditions</span>
              <div className="seg">
                {(["AND", "OR"] as const).map((op) => (
                  <button
                    key={op}
                    className={`seg__btn ${edge.data?.conditions.operator === op ? "seg__btn--on" : ""}`}
                    onClick={() => setEdgeOperator(edge.id, op)}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            {(edge.data?.conditions.rules ?? []).map((rule) => (
              <RuleEditor
                key={rule.id}
                rule={rule}
                onChange={(patch) => updateRule(edge.id, rule.id, patch)}
                onRemove={() => removeRule(edge.id, rule.id)}
              />
            ))}

            <button
              className="btn btn--ghost btn--block"
              onClick={() => {
                const src = nodes.find((n) => n.id === edge.source);
                const sourceType = src?.data.nodeType === "unit" ? "unit" : "assessment";
                addRule(edge.id, defaultRuleFor(edge.source, sourceType));
              }}
            >
              + Add condition
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function RuleEditor({
  rule,
  onChange,
  onRemove,
}: {
  rule: Rule;
  onChange: (patch: Partial<Rule>) => void;
  onRemove: () => void;
}) {
  const nodes = useBuilder((s) => s.nodes);
  const metrics = METRICS_BY_SOURCE[rule.sourceType];
  const operators = operatorsForMetric(rule.metric);

  const onMetricChange = (metric: RuleMetric) => {
    if (isBooleanMetric(metric)) onChange({ metric, operator: "eq", value: true, range: undefined });
    else if (metric === "score_range")
      onChange({ metric, operator: "between", value: undefined, range: { min: 0, max: 49, minInclusive: true, maxInclusive: true } });
    else onChange({ metric, operator: "gte", value: 0, range: undefined });
  };

  return (
    <div className="rule" data-testid="rule">
      <div className="rule__row">
        <select
          value={rule.sourceType}
          onChange={(e) => {
            const sourceType = e.target.value as "assessment" | "unit";
            onMetricChangeForSource(sourceType, onChange);
          }}
        >
          <option value="assessment">assessment</option>
          <option value="unit">unit</option>
        </select>

        <select value={rule.sourceNodeId} onChange={(e) => onChange({ sourceNodeId: e.target.value })}>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.data.label}
            </option>
          ))}
        </select>

        <button className="rule__remove" onClick={onRemove} aria-label="Remove condition">
          ×
        </button>
      </div>

      <div className="rule__row">
        <select value={rule.metric} onChange={(e) => onMetricChange(e.target.value as RuleMetric)}>
          {metrics.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select value={rule.operator} onChange={(e) => onChange({ operator: e.target.value as RuleOperator })}>
          {operators.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="rule__row">
        {isBooleanMetric(rule.metric) ? (
          <select
            value={String(rule.value)}
            onChange={(e) => onChange({ value: e.target.value === "true" })}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : rule.metric === "score_range" || rule.operator === "between" ? (
          <div className="rule__range">
            <input
              type="number"
              value={rule.range?.min ?? 0}
              onChange={(e) =>
                onChange({ range: { ...(rule.range ?? { min: 0, max: 0 }), min: Number(e.target.value) } })
              }
            />
            <span>to</span>
            <input
              type="number"
              value={rule.range?.max ?? 0}
              onChange={(e) =>
                onChange({ range: { ...(rule.range ?? { min: 0, max: 0 }), max: Number(e.target.value) } })
              }
            />
          </div>
        ) : (
          <input
            type="number"
            value={typeof rule.value === "number" ? rule.value : 0}
            onChange={(e) => onChange({ value: Number(e.target.value) })}
          />
        )}
      </div>
    </div>
  );
}

// When switching source type, reset metric/value to a valid default for that type.
function onMetricChangeForSource(
  sourceType: "assessment" | "unit",
  onChange: (patch: Partial<Rule>) => void,
) {
  const metric = METRICS_BY_SOURCE[sourceType][0];
  onChange({ sourceType, metric, operator: "eq", value: true, range: undefined });
}
