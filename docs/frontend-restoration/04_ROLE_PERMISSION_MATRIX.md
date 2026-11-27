# Role Permission Matrix

A read-only production query verified seven rows in `public.roles`. Every role returned zero explicit `public.role_permissions` mappings. Access evidence must therefore come from the server guards and specific database policies and functions, rather than from a permission matrix inferred from the old previews.

| Original role | Production code | Required boundary for restoration |
|---|---|---|
| Owner | `owner` | Verify owner-only settings and account administration |
| Administrator | `admin` | Verify each administrative operation and owner exclusions |
| Teacher | `teacher` | Scope to assigned courses and groups |
| Student | `student` | Scope academic records to self and entitlements |
| Parent | `parent` | Scope each journey to active linked children |
| Manager | `manager` | Establish team, assignment and ticket scope |
| Technical Support | `support` | Establish technical ticket scope |
| Customer Service | No separate code found | Define and approve separate database authorization before route activation |
