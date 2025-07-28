import { useRecoilState } from 'recoil';
import { useEffect, useCallback, useMemo } from 'react';
import { isAssistantsEndpoint } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { TMessageProps } from '~/common';

import MessageContent from '~/components/Messages/MessageContent';
import ContentRender from '~/components/Messages/ContentRender';

import MessageParts from './MessageParts';

import Message from './Message';
import store from '~/store';
import React from 'react';

export default React.memo(
  function MultiMessage({
    messageId,
    messagesTree,
    currentEditId,
    setCurrentEditId,
  }: TMessageProps) {
    const [siblingIdx, setSiblingIdx] = useRecoilState(store.messagesSiblingIdxFamily(messageId));

    const setSiblingIdxRev = useCallback(
      (value: number) => {
        setSiblingIdx((messagesTree?.length ?? 0) - value - 1);
      },
      [messagesTree?.length, setSiblingIdx],
    );

    useEffect(() => {
      // reset siblingIdx when the tree changes, mostly when a new message is submitting.
      setSiblingIdx(0);
    }, [messagesTree?.length]);

    useEffect(() => {
      if (messagesTree?.length && siblingIdx >= messagesTree.length) {
        setSiblingIdx(0);
      }
    }, [siblingIdx, messagesTree?.length, setSiblingIdx]);

    const messageGroups = useMemo(() => {
      if (!messagesTree || !Array.isArray(messagesTree) || messagesTree.length === 0) {
        return [];
      }

      // Sort messages chronologically
      const sortedMessages = [...messagesTree].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      const groups: Array<{
        userMessage?: TMessage;
        aiResponses: TMessage[];
        standalone?: TMessage;
      }> = [];

      const processedIds = new Set<string>();

      // Process messages to create conversation turns
      for (const message of sortedMessages) {
        if (processedIds.has(message.messageId)) {
          continue;
        }

        if (message.isCreatedByUser) {
          // This is a user message - find all AI responses to this specific message
          const directAiResponses = sortedMessages.filter(
            (msg) =>
              !msg.isCreatedByUser &&
              msg.parentMessageId === message.messageId &&
              !processedIds.has(msg.messageId),
          );

          // Mark all as processed
          processedIds.add(message.messageId);
          directAiResponses.forEach((resp) => processedIds.add(resp.messageId));

          if (directAiResponses.length > 1) {
            // Multiple AI responses to this user message - group them side by side
            groups.push({
              userMessage: message,
              aiResponses: directAiResponses,
            });
          } else {
            // Single or no AI response - render normally
            groups.push({
              standalone: message,
              aiResponses: [],
            });

            if (directAiResponses.length === 1) {
              groups.push({
                standalone: directAiResponses[0],
                aiResponses: [],
              });
            }
          }
        } else if (!processedIds.has(message.messageId)) {
          // Orphaned AI message (shouldn't happen normally)
          processedIds.add(message.messageId);
          groups.push({
            standalone: message,
            aiResponses: [],
          });
        }
      }

      return groups;
    }, [messagesTree]);

    if (!messagesTree || messagesTree.length === 0) {
      return null;
    }

    // For original behavior with single message
    if (
      messageGroups.length === 1 &&
      messageGroups[0].standalone &&
      messageGroups[0].aiResponses.length === 0
    ) {
      const message = messagesTree[messagesTree.length - siblingIdx - 1] as TMessage | undefined;

      if (!message) {
        return null;
      }

      if (isAssistantsEndpoint(message.endpoint) && message.content) {
        return (
          <MessageParts
            key={message.messageId}
            message={message}
            currentEditId={currentEditId}
            setCurrentEditId={setCurrentEditId}
            siblingIdx={messagesTree.length - siblingIdx - 1}
            siblingCount={messagesTree.length}
            setSiblingIdx={setSiblingIdxRev}
          />
        );
      } else if (message.content) {
        return (
          <MessageContent
            key={message.messageId}
            message={message}
            currentEditId={currentEditId}
            setCurrentEditId={setCurrentEditId}
            siblingIdx={messagesTree.length - siblingIdx - 1}
            siblingCount={messagesTree.length}
            setSiblingIdx={setSiblingIdxRev}
          />
        );
      }

      return (
        <Message
          key={message.messageId}
          message={message}
          currentEditId={currentEditId}
          setCurrentEditId={setCurrentEditId}
          siblingIdx={messagesTree.length - siblingIdx - 1}
          siblingCount={messagesTree.length}
          setSiblingIdx={setSiblingIdxRev}
        />
      );
    }

    return (
      <div className="flex flex-col" style={{ width: '100%', alignSelf: 'center' }}>
        <div style={{ width: '90%', alignSelf: 'center' }}>
          {messageGroups.map((group, groupIndex) => {
            if (group.standalone) {
              // Render single message
              const message = group.standalone;

              if (isAssistantsEndpoint(message.endpoint) && message.content) {
                return (
                  <MessageParts
                    key={`${message.messageId}-${groupIndex}`}
                    message={message}
                    currentEditId={currentEditId}
                    setCurrentEditId={setCurrentEditId}
                    siblingIdx={0}
                    siblingCount={1}
                    setSiblingIdx={() => {}}
                  />
                );
              } else if (message.content) {
                return (
                  <MessageContent
                    key={`${message.messageId}-${groupIndex}`}
                    message={message}
                    currentEditId={currentEditId}
                    setCurrentEditId={setCurrentEditId}
                    siblingIdx={0}
                    siblingCount={1}
                    setSiblingIdx={() => {}}
                  />
                );
              }

              return (
                <Message
                  key={`${message.messageId}-${groupIndex}`}
                  message={message}
                  currentEditId={currentEditId}
                  setCurrentEditId={setCurrentEditId}
                  siblingIdx={0}
                  siblingCount={1}
                  setSiblingIdx={() => {}}
                  userMessage={true}
                />
              );
            } else if (group.userMessage && group.aiResponses.length > 1) {
              // Render side-by-side group
              const { userMessage, aiResponses } = group;

              return (
                <div
                  key={`group-${userMessage.messageId}-${groupIndex}`}
                  className="mb-6 flex flex-col gap-4"
                >
                  {/* User message  from backend*/}
                  <Message
                    key={`${userMessage.messageId}-${groupIndex}`}
                    message={userMessage}
                    currentEditId={currentEditId}
                    setCurrentEditId={setCurrentEditId}
                    siblingIdx={0}
                    siblingCount={1}
                    setSiblingIdx={() => {}}
                    userMessage={true}
                  />

                  {/* AI responses side-by-side  from backend */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      width: '97%',
                      // alignItems: 'center',
                      justifyContent: 'center',
                      alignSelf: 'center',
                    }}
                  >
                    {aiResponses.map((aiResponse, aiIndex) => (
                      <div key={`${aiResponses[0].messageId}-${groupIndex}`} style={{ flex: 1 }}>
                        <ContentRender
                          message={aiResponse}
                          currentEditId={currentEditId}
                          setCurrentEditId={setCurrentEditId}
                          siblingIdx={aiIndex}
                          siblingCount={aiResponses.length}
                          setSiblingIdx={() => {}}
                          isCard={true}
                          isCustomLogic={true}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.messageId === nextProps.messageId &&
      prevProps.currentEditId === nextProps.currentEditId &&
      JSON.stringify(prevProps.messagesTree) === JSON.stringify(nextProps.messagesTree)
    );
  },
);
