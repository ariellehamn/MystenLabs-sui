// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useFeature, useGrowthBook } from '@growthbook/growthbook-react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';

import {
    genTableDataFromTxData,
    getDataOnTxDigests,
    type TxnData,
} from '~/components/transaction-card/TxCardUtils';
import { useRpc } from '~/hooks/useRpc';
import { Banner } from '~/ui/Banner';
import { LoadingSpinner } from '~/ui/LoadingSpinner';
import { PageHeader } from '~/ui/PageHeader';
import { TableCard } from '~/ui/TableCard';
import { Tab, TabGroup, TabList, TabPanels } from '~/ui/Tabs';
import { Text } from '~/ui/Text';
import { GROWTHBOOK_FEATURES } from '~/utils/growthbook';
import { convertNumberToDate } from '~/utils/timeUtils';

function CheckpointDetail() {
    const enabled = useFeature(GROWTHBOOK_FEATURES.EPOCHS_CHECKPOINTS).on;
    const { digest } = useParams<{ digest: string }>();
    const rpc = useRpc();

    const checkpointQuery = useQuery(
        ['checkpoints', digest],
        async () => await rpc.getCheckpoint(digest!)
    );

    const { data: transactions } = useQuery(
        ['checkpoint-transactions'],
        async () => {
            // todo: replace this with `sui_getTransactions` call when we are
            // able to query by checkpoint digest
            const txData = await getDataOnTxDigests(
                rpc,
                checkpointQuery.data?.transactions!
            );
            return genTableDataFromTxData(txData as TxnData[]);
        },
        { enabled: checkpointQuery.isFetched }
    );

    if (!enabled) return <Navigate to="/" />;

    if (checkpointQuery.isError)
        return (
            <Banner variant="error" fullWidth>
                There was an issue retrieving data for checkpoint: {digest}
            </Banner>
        );

    if (checkpointQuery.isLoading) return <LoadingSpinner />;

    const {
        data: { epochRollingGasCostSummary, ...checkpoint },
    } = checkpointQuery;

    return (
        <div className="flex flex-col space-y-12">
            <PageHeader title={checkpoint.digest} type="Checkpoint" />
            <div className="space-y-8">
                <TabGroup as="div" size="lg">
                    <TabList>
                        <Tab>Details</Tab>
                    </TabList>
                    <TabPanels>
                        <dl className="mt-4 space-y-3.75">
                            <div className="space-y-1 sm:grid sm:grid-cols-5 sm:space-y-0">
                                <dt>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        Checkpoint Sequence No.
                                    </Text>
                                </dt>
                                <dd>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        {checkpoint.sequenceNumber}
                                    </Text>
                                </dd>
                            </div>
                            <div className="space-y-1 sm:grid sm:grid-cols-5 sm:space-y-0">
                                <dt>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        Epoch
                                    </Text>
                                </dt>
                                <dd>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        {checkpoint.epoch}
                                    </Text>
                                </dd>
                            </div>
                            <div className="space-y-1 sm:grid sm:grid-cols-5 sm:space-y-0">
                                <dt>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        Checkpoint Timestamp
                                    </Text>
                                </dt>
                                <dd>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        {convertNumberToDate(
                                            checkpoint.timestampMs
                                        )}
                                    </Text>
                                </dd>
                            </div>
                        </dl>
                    </TabPanels>
                </TabGroup>
                <TabGroup as="div" size="lg">
                    <TabList>
                        <Tab>Gas & Storage Fee</Tab>
                    </TabList>
                    <TabPanels>
                        <dl className="mt-4 space-y-2">
                            <div className="space-y-1 sm:grid sm:grid-cols-5 sm:space-y-0">
                                <dt>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        Computation Fee
                                    </Text>
                                </dt>
                                <dd>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        {
                                            epochRollingGasCostSummary.computation_cost
                                        }
                                    </Text>
                                </dd>
                            </div>
                            <div className="space-y-1 sm:grid sm:grid-cols-5 sm:space-y-0">
                                <dt>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        Storage Fee
                                    </Text>
                                </dt>
                                <dd>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        {
                                            epochRollingGasCostSummary.storage_cost
                                        }
                                    </Text>
                                </dd>
                            </div>
                            <div className="space-y-1 sm:grid sm:grid-cols-5 sm:space-y-0">
                                <dt>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        Storage Rebate
                                    </Text>
                                </dt>
                                <dd>
                                    <Text
                                        color="steel-darker"
                                        variant="p1/medium"
                                    >
                                        {
                                            epochRollingGasCostSummary.storage_rebate
                                        }
                                    </Text>
                                </dd>
                            </div>
                        </dl>
                    </TabPanels>
                </TabGroup>

                <TabGroup as="div" size="lg">
                    <TabList>
                        <Tab>Checkpoint Transactions</Tab>
                    </TabList>
                    <TabPanels>
                        <div className="mt-4">
                            {transactions?.data ? (
                                <TableCard
                                    data={transactions?.data}
                                    columns={transactions?.columns}
                                />
                            ) : null}
                        </div>
                    </TabPanels>
                </TabGroup>
            </div>
        </div>
    );
}

export default () => {
    const gb = useGrowthBook();
    if (gb?.ready) {
        return <CheckpointDetail />;
    } else {
        return <LoadingSpinner />;
    }
};
