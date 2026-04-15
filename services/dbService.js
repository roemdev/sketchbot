const { createClient } = require("@supabase/supabase-js");
const { supabase: cfg } = require("../config.json");

const supabase = createClient(cfg.url, cfg.serviceRoleKey);

module.exports = supabase;