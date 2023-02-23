// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '~/ui/Text';

type DescriptionListItem = {
    label: string;
    value: string;
};

interface DescriptionListProps {
    items: DescriptionListItem[];
}

function Item({ children }: { children: React.ReactNode }) {
    return <dd>{children}</dd>;
}

function Label({ children }: { children: string }) {
    return (
        <dt>
            <Text color="steel-darker" variant="p1/medium">
                {children}
            </Text>
        </dt>
    );
}

function DescriptionList({ children }: { children: React.ReactNode }) {
    return (
        <dl className="space-y-2">
            <div className="space-y-2 sm:grid sm:grid-cols-5 sm:gap-4 sm:space-y-0">
                {children}
            </div>
        </dl>
    );
}

DescriptionList.Item = Item;
DescriptionList.Label = Label;
export { DescriptionList };
