import { LinkPlugin as LexicalLinkPlugin } from '@lexical/react/LexicalLinkPlugin'

import { lexicalUtils } from '@/components/lexical/utils/lexical.utils.ts'

export const LinkPlugin = () => {
  return <LexicalLinkPlugin validateUrl={lexicalUtils.validateUrl} />
}
