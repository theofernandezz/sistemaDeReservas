'use server'

import { createClient } from '@/utils/supabase/server'

export async function getPublicBusinessSlugs() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('businesses')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false })

  return data?.map(b => ({ slug: b.slug, updatedAt: b.updated_at })) || []
}
