'use client';

import { BotIcon } from 'lucide-react';
import { formatDistanceToNow, isValid } from 'date-fns';

import type { CrmMessage } from '@banking-crm/types';

import { CustomerListCard } from './result-cards/customer-list-card';
import { ScoreCard } from './result-cards/score-card';
import { RecommendationCard } from './result-cards/recommendation-card';
import { MessageResultCard } from './result-cards/message-result-card';
import type {
  CustomerListResultData,
  ScoreCardResultData,
  RecommendationCardResultData,
  MessageCardResultData,
} from '@banking-crm/types';

interface AssistantMessageProps {
  message: CrmMessage;
}

function ResultCard({ type, data }: { type: string; data: unknown }) {
  if (type === 'customer_list') return <CustomerListCard data={data as CustomerListResultData} />;
  if (type === 'score_card') return <ScoreCard data={data as ScoreCardResultData} />;
  if (type === 'recommendation_card')
    return <RecommendationCard data={data as RecommendationCardResultData} />;
  if (type === 'message_card') return <MessageResultCard data={data as MessageCardResultData} />;
  return null;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  return (
    <div className="flex justify-start mb-3 gap-2">
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
        <BotIcon className="h-4 w-4 text-primary" />
      </div>
      <div className="max-w-[85%]">
        {message.content && (
          <div className="rounded-2xl rounded-tl-sm border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {message.content}
          </div>
        )}

        {message.resultType != null && !!message.resultData && (
          <ResultCard type={message.resultType} data={message.resultData} />
        )}

        <p className="text-[11px] text-muted-foreground mt-1 ml-1">
          {(() => {
            const d = new Date(message.createdAt);
            return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : 'just now';
          })()}
        </p>
      </div>
    </div>
  );
}
