# SPEC-002: Intent Graph Schema Technical Specification

## Document Information
| Field | Value |
|-------|-------|
| **Component** | Intent Graph Schema |
| **Author** | Kevin Owens <kevin.a.owens@gmail.com> |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Related PRD** | PRD-002: Intent Graph |

---

## Overview

This specification defines the complete schema for Intent Graphs—the semantic representation of software purpose that serves as the source of truth in the Living Software Platform.

---

## Schema Version

```
Version: 1.0.0
Format: JSON Schema Draft 2020-12
```

---

## Core Schema

### Intent Graph Root

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://claude.ai/schemas/intent-graph/1.0.0",
  "title": "IntentGraph",
  "type": "object",
  "required": ["id", "name", "version", "goals"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for the intent graph"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "description": "Human-readable name"
    },
    "description": {
      "type": "string",
      "maxLength": 2000,
      "description": "Extended description of the software's purpose"
    },
    "version": {
      "type": "integer",
      "minimum": 1,
      "description": "Schema version for this intent graph"
    },
    "projectId": {
      "type": "string",
      "format": "uuid",
      "description": "Associated project in Claude Context"
    },
    "goals": {
      "type": "array",
      "items": { "$ref": "#/$defs/Goal" },
      "minItems": 1,
      "description": "Top-level goals this software should achieve"
    },
    "constraints": {
      "type": "array",
      "items": { "$ref": "#/$defs/Constraint" },
      "default": [],
      "description": "Constraints on the software"
    },
    "entities": {
      "type": "array",
      "items": { "$ref": "#/$defs/Entity" },
      "default": [],
      "description": "Core domain entities"
    },
    "behaviors": {
      "type": "array",
      "items": { "$ref": "#/$defs/Behavior" },
      "default": [],
      "description": "Behavioral specifications"
    },
    "contexts": {
      "type": "array",
      "items": { "$ref": "#/$defs/Context" },
      "default": [],
      "description": "Business and technical context"
    },
    "metadata": {
      "$ref": "#/$defs/Metadata"
    }
  }
}
```

### Goal Schema

```json
{
  "$defs": {
    "Goal": {
      "type": "object",
      "required": ["id", "description"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "description": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000,
          "description": "What this goal achieves"
        },
        "successCriteria": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Measurable criteria for goal completion"
        },
        "priority": {
          "type": "string",
          "enum": ["critical", "high", "medium", "low"],
          "default": "medium"
        },
        "status": {
          "type": "string",
          "enum": ["proposed", "accepted", "in_progress", "achieved", "abandoned"],
          "default": "proposed"
        },
        "parentGoalId": {
          "type": "string",
          "format": "uuid",
          "description": "Parent goal for hierarchical organization"
        },
        "subGoalIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" },
          "description": "Child goals"
        },
        "linkedConstraintIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" },
          "description": "Constraints that apply to this goal"
        },
        "linkedBehaviorIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" },
          "description": "Behaviors that implement this goal"
        },
        "source": { "$ref": "#/$defs/SourceContext" },
        "rationale": {
          "type": "string",
          "description": "Why this goal matters"
        }
      }
    }
  }
}
```

### Constraint Schema

```json
{
  "$defs": {
    "Constraint": {
      "type": "object",
      "required": ["id", "description", "category"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "description": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        },
        "category": {
          "type": "string",
          "enum": [
            "functional",
            "security",
            "performance",
            "scalability",
            "compliance",
            "compatibility",
            "usability",
            "business",
            "technical"
          ]
        },
        "severity": {
          "type": "string",
          "enum": ["must", "should", "could"],
          "default": "should",
          "description": "MoSCoW priority"
        },
        "verificationMethod": {
          "type": "string",
          "description": "How to verify this constraint is met"
        },
        "linkedGoalIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" }
        },
        "linkedEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" }
        },
        "linkedBehaviorIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" }
        },
        "source": { "$ref": "#/$defs/SourceContext" },
        "conflictsWith": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" },
          "description": "IDs of conflicting constraints"
        }
      }
    }
  }
}
```

### Entity Schema

```json
{
  "$defs": {
    "Entity": {
      "type": "object",
      "required": ["id", "name"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100,
          "pattern": "^[A-Z][a-zA-Z0-9]*$",
          "description": "PascalCase entity name"
        },
        "description": {
          "type": "string",
          "maxLength": 1000
        },
        "attributes": {
          "type": "array",
          "items": { "$ref": "#/$defs/EntityAttribute" }
        },
        "relationships": {
          "type": "array",
          "items": { "$ref": "#/$defs/EntityRelationship" }
        },
        "stateMachine": {
          "$ref": "#/$defs/StateMachine",
          "description": "Optional state machine for stateful entities"
        },
        "validationRules": {
          "type": "array",
          "items": { "$ref": "#/$defs/ValidationRule" }
        },
        "linkedBehaviorIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" }
        },
        "source": { "$ref": "#/$defs/SourceContext" }
      }
    },
    
    "EntityAttribute": {
      "type": "object",
      "required": ["name", "dataType"],
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-z][a-zA-Z0-9]*$",
          "description": "camelCase attribute name"
        },
        "dataType": { "$ref": "#/$defs/DataType" },
        "required": {
          "type": "boolean",
          "default": false
        },
        "unique": {
          "type": "boolean",
          "default": false
        },
        "defaultValue": {
          "description": "Default value (type depends on dataType)"
        },
        "constraints": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Validation constraints as expressions"
        },
        "description": {
          "type": "string"
        }
      }
    },
    
    "DataType": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "primitive": {
              "type": "string",
              "enum": ["string", "integer", "float", "boolean", "date", "datetime", "uuid", "json"]
            }
          },
          "required": ["primitive"]
        },
        {
          "type": "object",
          "properties": {
            "array": { "$ref": "#/$defs/DataType" }
          },
          "required": ["array"]
        },
        {
          "type": "object",
          "properties": {
            "enum": {
              "type": "array",
              "items": { "type": "string" },
              "minItems": 1
            }
          },
          "required": ["enum"]
        },
        {
          "type": "object",
          "properties": {
            "reference": {
              "type": "string",
              "format": "uuid",
              "description": "Reference to another entity"
            }
          },
          "required": ["reference"]
        }
      ]
    },
    
    "EntityRelationship": {
      "type": "object",
      "required": ["name", "targetEntityId", "type"],
      "properties": {
        "name": {
          "type": "string"
        },
        "targetEntityId": {
          "type": "string",
          "format": "uuid"
        },
        "type": {
          "type": "string",
          "enum": ["has_one", "has_many", "belongs_to", "many_to_many"]
        },
        "inverse": {
          "type": "string",
          "description": "Name of inverse relationship on target"
        },
        "cascade": {
          "type": "string",
          "enum": ["none", "delete", "nullify"],
          "default": "none"
        },
        "constraints": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    
    "StateMachine": {
      "type": "object",
      "required": ["states", "initialState"],
      "properties": {
        "states": {
          "type": "array",
          "items": { "$ref": "#/$defs/State" },
          "minItems": 1
        },
        "initialState": {
          "type": "string"
        },
        "transitions": {
          "type": "array",
          "items": { "$ref": "#/$defs/StateTransition" }
        }
      }
    },
    
    "State": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "isFinal": { "type": "boolean", "default": false }
      }
    },
    
    "StateTransition": {
      "type": "object",
      "required": ["from", "to", "trigger"],
      "properties": {
        "from": { "type": "string" },
        "to": { "type": "string" },
        "trigger": { "type": "string" },
        "guard": { "type": "string", "description": "Condition expression" },
        "action": { "type": "string", "description": "Action to perform" }
      }
    },
    
    "ValidationRule": {
      "type": "object",
      "required": ["expression", "message"],
      "properties": {
        "expression": {
          "type": "string",
          "description": "Boolean expression for validation"
        },
        "message": {
          "type": "string",
          "description": "Error message if validation fails"
        },
        "severity": {
          "type": "string",
          "enum": ["error", "warning"],
          "default": "error"
        }
      }
    }
  }
}
```

### Behavior Schema

```json
{
  "$defs": {
    "Behavior": {
      "type": "object",
      "required": ["id", "name", "trigger"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "description": {
          "type": "string"
        },
        "trigger": { "$ref": "#/$defs/BehaviorTrigger" },
        "preconditions": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Conditions that must be true before behavior executes"
        },
        "steps": {
          "type": "array",
          "items": { "$ref": "#/$defs/BehaviorStep" }
        },
        "postconditions": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Conditions guaranteed after behavior executes"
        },
        "errorHandlers": {
          "type": "array",
          "items": { "$ref": "#/$defs/ErrorHandler" }
        },
        "linkedGoalIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" }
        },
        "linkedEntityIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" }
        },
        "linkedConstraintIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" }
        },
        "source": { "$ref": "#/$defs/SourceContext" }
      }
    },
    
    "BehaviorTrigger": {
      "type": "object",
      "required": ["type", "description"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["user_action", "system_event", "time_based", "condition", "api_call"]
        },
        "description": {
          "type": "string"
        },
        "parameters": {
          "type": "array",
          "items": { "$ref": "#/$defs/TriggerParameter" }
        }
      }
    },
    
    "TriggerParameter": {
      "type": "object",
      "required": ["name", "dataType"],
      "properties": {
        "name": { "type": "string" },
        "dataType": { "$ref": "#/$defs/DataType" },
        "required": { "type": "boolean", "default": true },
        "description": { "type": "string" }
      }
    },
    
    "BehaviorStep": {
      "type": "object",
      "required": ["order", "description", "actor"],
      "properties": {
        "order": {
          "type": "integer",
          "minimum": 1
        },
        "description": {
          "type": "string"
        },
        "actor": {
          "type": "string",
          "enum": ["user", "system", "external"]
        },
        "entityId": {
          "type": "string",
          "format": "uuid",
          "description": "Entity involved in this step"
        },
        "action": {
          "type": "string",
          "enum": ["create", "read", "update", "delete", "validate", "transform", "notify", "custom"]
        },
        "condition": {
          "type": "string",
          "description": "Condition for conditional steps"
        },
        "alternativePaths": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "condition": { "type": "string" },
              "steps": {
                "type": "array",
                "items": { "$ref": "#/$defs/BehaviorStep" }
              }
            }
          }
        }
      }
    },
    
    "ErrorHandler": {
      "type": "object",
      "required": ["errorType", "handling"],
      "properties": {
        "errorType": {
          "type": "string",
          "description": "Type of error to handle"
        },
        "condition": {
          "type": "string",
          "description": "Optional condition for when this handler applies"
        },
        "handling": {
          "type": "string",
          "enum": ["retry", "fallback", "abort", "ignore", "custom"]
        },
        "customAction": {
          "type": "string",
          "description": "Custom handling description"
        },
        "userMessage": {
          "type": "string",
          "description": "Message to show user"
        }
      }
    }
  }
}
```

### Context Schema

```json
{
  "$defs": {
    "Context": {
      "type": "object",
      "required": ["id", "category", "description"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "category": {
          "type": "string",
          "enum": ["business", "technical", "historical", "user_research", "competitive", "regulatory"]
        },
        "description": {
          "type": "string"
        },
        "implications": {
          "type": "array",
          "items": { "type": "string" },
          "description": "What this context implies for the software"
        },
        "linkedNodeIds": {
          "type": "array",
          "items": { "type": "string", "format": "uuid" },
          "description": "Goals, constraints, etc. this context explains"
        },
        "source": { "$ref": "#/$defs/SourceContext" }
      }
    }
  }
}
```

### Metadata and Source Tracking

```json
{
  "$defs": {
    "Metadata": {
      "type": "object",
      "properties": {
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        },
        "createdBy": {
          "type": "string",
          "format": "uuid"
        },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "customFields": {
          "type": "object",
          "additionalProperties": true
        }
      }
    },
    
    "SourceContext": {
      "type": "object",
      "required": ["createdAt", "origin"],
      "properties": {
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "origin": {
          "type": "string",
          "enum": ["conversation", "import", "manual", "inference", "synthesis"]
        },
        "conversationRef": {
          "type": "string",
          "format": "uuid"
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "default": 0.5
        },
        "userConfirmed": {
          "type": "boolean",
          "default": false
        },
        "lastModifiedAt": {
          "type": "string",
          "format": "date-time"
        },
        "modificationHistory": {
          "type": "array",
          "items": { "$ref": "#/$defs/Modification" }
        }
      }
    },
    
    "Modification": {
      "type": "object",
      "required": ["timestamp", "type"],
      "properties": {
        "timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "type": {
          "type": "string",
          "enum": ["create", "update", "confirm", "reject"]
        },
        "previousValue": {},
        "reason": { "type": "string" },
        "actor": {
          "type": "string",
          "enum": ["user", "system", "inference"]
        }
      }
    }
  }
}
```

---

## Example Intent Graph

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "User Authentication System",
  "description": "Secure authentication system with email/password and OAuth support",
  "version": 1,
  "projectId": "660e8400-e29b-41d4-a716-446655440001",
  
  "goals": [
    {
      "id": "goal_001",
      "description": "Users can securely access their accounts",
      "successCriteria": [
        "Login succeeds with valid credentials in <2 seconds",
        "Invalid credentials are rejected with clear error",
        "Session persists appropriately"
      ],
      "priority": "critical",
      "status": "accepted",
      "linkedConstraintIds": ["con_001", "con_002", "con_003"],
      "linkedBehaviorIds": ["beh_001", "beh_002"],
      "source": {
        "createdAt": "2024-01-15T10:00:00Z",
        "origin": "conversation",
        "confidence": 0.95,
        "userConfirmed": true
      }
    }
  ],
  
  "constraints": [
    {
      "id": "con_001",
      "description": "Passwords must be hashed using bcrypt with cost factor 12",
      "category": "security",
      "severity": "must",
      "verificationMethod": "Unit test verifying bcrypt usage",
      "linkedGoalIds": ["goal_001"],
      "source": {
        "createdAt": "2024-01-15T10:05:00Z",
        "origin": "conversation",
        "confidence": 1.0,
        "userConfirmed": true
      }
    },
    {
      "id": "con_002",
      "description": "Lock account after 5 consecutive failed login attempts",
      "category": "security",
      "severity": "must",
      "verificationMethod": "Integration test with failure sequence",
      "linkedGoalIds": ["goal_001"],
      "linkedEntityIds": ["ent_001"],
      "source": {
        "createdAt": "2024-01-15T10:10:00Z",
        "origin": "conversation",
        "confidence": 0.9,
        "userConfirmed": true
      }
    },
    {
      "id": "con_003",
      "description": "Sessions expire after 24 hours of inactivity",
      "category": "security",
      "severity": "should",
      "linkedGoalIds": ["goal_001"],
      "linkedEntityIds": ["ent_002"],
      "source": {
        "createdAt": "2024-01-15T10:15:00Z",
        "origin": "inference",
        "confidence": 0.7,
        "userConfirmed": false
      }
    }
  ],
  
  "entities": [
    {
      "id": "ent_001",
      "name": "User",
      "description": "A registered user of the system",
      "attributes": [
        {
          "name": "id",
          "dataType": { "primitive": "uuid" },
          "required": true,
          "unique": true
        },
        {
          "name": "email",
          "dataType": { "primitive": "string" },
          "required": true,
          "unique": true,
          "constraints": ["valid_email_format"]
        },
        {
          "name": "passwordHash",
          "dataType": { "primitive": "string" },
          "required": true,
          "description": "bcrypt hash of password"
        },
        {
          "name": "failedLoginAttempts",
          "dataType": { "primitive": "integer" },
          "required": false,
          "defaultValue": 0
        },
        {
          "name": "lockedUntil",
          "dataType": { "primitive": "datetime" },
          "required": false
        },
        {
          "name": "status",
          "dataType": { "enum": ["active", "locked", "suspended", "deleted"] },
          "required": true,
          "defaultValue": "active"
        }
      ],
      "relationships": [
        {
          "name": "sessions",
          "targetEntityId": "ent_002",
          "type": "has_many",
          "inverse": "user",
          "cascade": "delete"
        }
      ],
      "stateMachine": {
        "states": [
          { "name": "active" },
          { "name": "locked" },
          { "name": "suspended" },
          { "name": "deleted", "isFinal": true }
        ],
        "initialState": "active",
        "transitions": [
          {
            "from": "active",
            "to": "locked",
            "trigger": "too_many_failed_attempts",
            "guard": "failedLoginAttempts >= 5"
          },
          {
            "from": "locked",
            "to": "active",
            "trigger": "unlock",
            "action": "reset_failed_attempts"
          }
        ]
      },
      "source": {
        "createdAt": "2024-01-15T10:20:00Z",
        "origin": "conversation",
        "confidence": 0.95,
        "userConfirmed": true
      }
    },
    {
      "id": "ent_002",
      "name": "Session",
      "description": "An active user session",
      "attributes": [
        {
          "name": "id",
          "dataType": { "primitive": "uuid" },
          "required": true,
          "unique": true
        },
        {
          "name": "token",
          "dataType": { "primitive": "string" },
          "required": true,
          "unique": true
        },
        {
          "name": "expiresAt",
          "dataType": { "primitive": "datetime" },
          "required": true
        },
        {
          "name": "lastActivityAt",
          "dataType": { "primitive": "datetime" },
          "required": true
        }
      ],
      "relationships": [
        {
          "name": "user",
          "targetEntityId": "ent_001",
          "type": "belongs_to"
        }
      ],
      "source": {
        "createdAt": "2024-01-15T10:25:00Z",
        "origin": "inference",
        "confidence": 0.8,
        "userConfirmed": true
      }
    }
  ],
  
  "behaviors": [
    {
      "id": "beh_001",
      "name": "User Login",
      "description": "Authenticate user with email and password",
      "trigger": {
        "type": "api_call",
        "description": "POST /auth/login",
        "parameters": [
          { "name": "email", "dataType": { "primitive": "string" }, "required": true },
          { "name": "password", "dataType": { "primitive": "string" }, "required": true }
        ]
      },
      "preconditions": [
        "email is valid format",
        "password is not empty"
      ],
      "steps": [
        {
          "order": 1,
          "description": "Validate email format",
          "actor": "system",
          "action": "validate"
        },
        {
          "order": 2,
          "description": "Find user by email",
          "actor": "system",
          "entityId": "ent_001",
          "action": "read"
        },
        {
          "order": 3,
          "description": "Check if user is locked",
          "actor": "system",
          "entityId": "ent_001",
          "action": "validate",
          "alternativePaths": [
            {
              "condition": "user.status == 'locked' && user.lockedUntil > now()",
              "steps": [
                {
                  "order": 1,
                  "description": "Return account locked error",
                  "actor": "system",
                  "action": "custom"
                }
              ]
            }
          ]
        },
        {
          "order": 4,
          "description": "Verify password against hash",
          "actor": "system",
          "action": "validate"
        },
        {
          "order": 5,
          "description": "Reset failed login attempts on success",
          "actor": "system",
          "entityId": "ent_001",
          "action": "update"
        },
        {
          "order": 6,
          "description": "Create new session",
          "actor": "system",
          "entityId": "ent_002",
          "action": "create"
        },
        {
          "order": 7,
          "description": "Return session token",
          "actor": "system",
          "action": "custom"
        }
      ],
      "postconditions": [
        "User has active session",
        "Session token is returned"
      ],
      "errorHandlers": [
        {
          "errorType": "user_not_found",
          "handling": "custom",
          "customAction": "Increment generic failed attempt, return invalid credentials",
          "userMessage": "Invalid email or password"
        },
        {
          "errorType": "invalid_password",
          "handling": "custom",
          "customAction": "Increment failed attempts, possibly lock account",
          "userMessage": "Invalid email or password"
        }
      ],
      "linkedGoalIds": ["goal_001"],
      "linkedEntityIds": ["ent_001", "ent_002"],
      "linkedConstraintIds": ["con_001", "con_002"],
      "source": {
        "createdAt": "2024-01-15T10:30:00Z",
        "origin": "conversation",
        "confidence": 0.9,
        "userConfirmed": true
      }
    }
  ],
  
  "contexts": [
    {
      "id": "ctx_001",
      "category": "business",
      "description": "This is a B2B SaaS application where security is paramount. Customers are enterprises with strict compliance requirements.",
      "implications": [
        "Audit logging required for all auth events",
        "Must support SSO integration in future",
        "Need clear security documentation"
      ],
      "linkedNodeIds": ["goal_001", "con_001", "con_002"],
      "source": {
        "createdAt": "2024-01-15T10:00:00Z",
        "origin": "conversation",
        "confidence": 0.95,
        "userConfirmed": true
      }
    }
  ],
  
  "metadata": {
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z",
    "createdBy": "user_123",
    "tags": ["authentication", "security", "mvp"]
  }
}
```

---

## Validation Rules

### Graph-Level Validation

1. All referenced IDs must exist in the graph
2. Goal hierarchies must not be circular
3. Entity relationships must be bidirectionally consistent
4. State machine transitions must reference valid states
5. Behavior steps must have sequential order numbers

### Cross-Reference Validation

```typescript
function validateIntentGraph(graph: IntentGraph): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Collect all IDs
  const allIds = new Set<string>();
  const idTypes = new Map<string, string>();
  
  for (const goal of graph.goals) {
    allIds.add(goal.id);
    idTypes.set(goal.id, 'goal');
  }
  // ... repeat for constraints, entities, behaviors, contexts
  
  // Validate all references
  for (const goal of graph.goals) {
    for (const constraintId of goal.linkedConstraintIds || []) {
      if (!allIds.has(constraintId)) {
        errors.push({
          path: `goals.${goal.id}.linkedConstraintIds`,
          message: `Referenced constraint ${constraintId} not found`
        });
      }
    }
    // ... validate other references
  }
  
  // Validate goal hierarchy
  const visited = new Set<string>();
  function checkCycle(goalId: string, path: string[]): boolean {
    if (path.includes(goalId)) {
      errors.push({
        path: `goals.${goalId}`,
        message: `Circular goal hierarchy: ${path.join(' -> ')} -> ${goalId}`
      });
      return true;
    }
    const goal = graph.goals.find(g => g.id === goalId);
    if (goal?.parentGoalId) {
      return checkCycle(goal.parentGoalId, [...path, goalId]);
    }
    return false;
  }
  
  for (const goal of graph.goals) {
    checkCycle(goal.id, []);
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

## Related Documents

- PRD-002: Intent Graph
- ADR-001: Intent as Source of Truth
- SPEC-004: Synthesis Engine
