# DPP datový model v1 (textil)

## Povinné sekce (draft)
- **product**: `name` (i18n), `category.code` (enum), `description` (i18n)
- **brand**: `legal_name`, `country_code` (ISO 3166-1), `contact.url` (https)
- **manufacturing**: `country_of_origin` (ISO), `tier1` (facility_name **nebo** withheld_reason)
- **materials[]**: `material_code`, `share_percent`, `recycled_content_percent` (součet share = 100)
- **care**: `symbols[]` *nebo* `text` (i18n)
- **compliance**: `reach_status` = yes|no|unknown; `safety_notes` (vol.)
- **durability_repair**: `warranty_months`, `repair_options.url`
- **end_of_life**: `recyclability_class`, `guidance` (i18n)
- **meta**: `schema_version="1.0.0"`, `created_at` (ISO 8601), `data_owner`, `status` (draft|published)

## Publikace
- Při `meta.status=published` je vyžadováno: `identifiers.dpp_id` (UUID v4) a `traceability.dpp_url` (https).

## REACH nápověda
- **yes**: prohlášení dodavatele o souladu s REACH; **no**: doložený nesoulad; **unknown**: neověřeno.
- Doporučení: vyžádat „Supplier Declaration of Conformity“.

## Recyklát vs. recyklovatelnost
- `recycled_content_percent` = podíl recyklátu v materiálu.
- `recyclability_class` = odhad recyklovatelnosti hotového výrobku (unknown/low/medium/high).

## AI estimate
- Pokud `meta.ai_estimate=true`, v `meta.sources` musí být alespoň jeden záznam s `type: "estimate"` a `field_path` na odhadované pole.
