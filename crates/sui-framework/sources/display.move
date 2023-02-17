// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Defines a Display struct which defines the way an Object
/// should be displayed. The intention is to keep data as independent
/// from its display as possible, protecting the development process
/// and keeping it separate from the ecosystem agreements.
///
/// Each of the fields of the Display object should allow for pattern
/// substitution and filling-in the pieces using the data from the object T.
///
/// More entry functions might be added in the future depending on the use cases.
module sui::display {
    use sui::publisher::{is_package, Publisher};
    use sui::tx_context::TxContext;
    use std::string::{String, utf8};
    use sui::vec_map::{Self, VecMap};
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::event;
    use std::vector;

    /// For when T does not belong to package in PublisherCap.
    const ENotOwner: u64 = 0;

    /// For when vectors passed into one of the multiple insert functions
    /// don't match in their lengths.
    const EVecLengthMismatch: u64 = 1;

    /// The Display<T> object. Defines the way a T instance should be
    /// displayed. Display object can only be created and modified with
    /// a PublisherCap, making sure that the rules are set by the owner
    /// of the type.
    ///
    /// Each of the display properties should support patterns outside
    /// of the system, making it simpler to customize Display based
    /// on the property values of an Object.
    /// ```
    /// // Example of a display object
    /// Display<0x...::capy::Capy> {
    ///  fields:
    ///    <name, "Capy { genes }">
    ///    <link, "https://capy.art/capy/{ id }">
    ///    <image, "https://api.capy.art/capy/{ id }/svg">
    ///    <description, "Lovely Capy, one of many">
    /// }
    /// ```
    ///
    /// Uses only String type due to external-facing nature of the object,
    /// the property names have a priority over their types.
    struct Display<phantom T: key> has key {
        id: UID,
        /// Contains fields for display. Currently supported
        /// fields are: name, link, image and description.
        fields: VecMap<String, String>,
    }

    /// Event: emitted when a new Display object has been created for type T.
    /// Type signature of the event corresponds to the type while id serves for
    /// the discovery.
    ///
    /// Since Sui RPC supports querying events by type, finding a Display for the T
    /// would be as simple as looking for the first event with `Display<T>`.
    struct DisplayCreated<phantom T: key> has copy, drop {
        id: ID
    }

    // ============ Initializer Functions ===========

    /// Since the only way to own a Display is before it has been published,
    /// we don't need to perform an authorization check.
    ///
    /// Also, the only place it can be used is the function where the Display
    /// object was created; hence values and names are likely to be hardcoded and
    /// vector<u8> is the best type for that purpose.
    public fun set_owned<T: key>(d: Display<T>, name: vector<u8>, value: vector<u8>): Display<T> {
        set_internal(&mut d, utf8(name), utf8(value));
        d
    }

    /// Create an empty Display object. It can either be shared empty or filled
    /// with data right away via cheaper `set_owned` method.
    public fun empty<T: key>(pub: &Publisher, ctx: &mut TxContext): Display<T> {
        assert!(is_package<T>(pub), ENotOwner);

        let uid = object::new(ctx);

        event::emit(DisplayCreated<T> {
            id: object::uid_to_inner(&uid)
        });

        Display {
            id: uid,
            fields: vec_map::empty()
        }
    }

    /// Share an object after the initialization is complete.
    public fun share<T: key>(d: Display<T>) {
        transfer::share_object(d);
    }

    // ========== Entry functions ==========

    /// Create a new empty Display<T> object and share it.
    entry public fun create_and_share<T: key>(pub: &Publisher, ctx: &mut TxContext) {
        share(empty<T>(pub, ctx))
    }

    /// Create a new Display<T> object with a set of fields.
    entry public fun create_with_fields<T: key>(
        pub: &Publisher, fields: vector<String>, values: vector<String>, ctx: &mut TxContext
    ) {
        let len = vector::length(&fields);
        assert!(len == vector::length(&values), EVecLengthMismatch);

        let i = 0;
        let display = empty<T>(pub, ctx);
        while (i < len) {
            set_internal(&mut display, *vector::borrow(&fields, i), *vector::borrow(&values, i));
            i = i + 1;
        };

        share(display)
    }

    /// Sets a custom `name` field with the `value`.
    entry public fun set<T: key>(pub: &Publisher, d: &mut Display<T>, name: String, value: String) {
        assert!(is_package<T>(pub), ENotOwner);
        set_internal(d, name, value)
    }

    /// Sets multiple `fields` with `values`.
    entry public fun set_multiple<T: key>(
        pub: &Publisher, d: &mut Display<T>, fields: vector<String>, values: vector<String>
    ) {
        let len = vector::length(&fields);
        assert!(is_package<T>(pub), ENotOwner);
        assert!(len == vector::length(&values), EVecLengthMismatch);

        let i = 0;
        while (i < 0) {
            set_internal(d, *vector::borrow(&fields, i), *vector::borrow(&values, i));
            i = i + 1;
        };
    }

    /// Private method for inserting fields without security checks.
    fun set_internal<T: key>(d: &mut Display<T>, name: String, value: String) {
        vec_map::insert(&mut d.fields, name, value)
    }
}

#[test_only]
module sui::display_tests {
    use sui::object::UID;
    use sui::test_scenario as test;
    use std::string::String;
    use sui::publisher;
    use sui::display;

    /// An example object.
    /// Purely for visibility.
    struct Capy has key {
        id: UID,
        name: String
    }

    /// Test witness type to create a Publisher object.
    struct CAPY has drop {}

    #[test]
    fun capy_init() {
        let test = test::begin(@0x2);
        let pub = publisher::test_claim(CAPY {}, test::ctx(&mut test));

        // create a new display object
        let display = display::empty<Capy>(&pub, test::ctx(&mut test));

        let d = display::set_owned(display, b"name", b"Capy {name}");
        let d = display::set_owned(d, b"link", b"https://capy.art/capy/{id}");
        let d = display::set_owned(d, b"image", b"https://api.capy.art/capy/{id}/svg");
        let d = display::set_owned(d, b"description", b"A Lovely Capy");

        publisher::burn(pub);
        display::share(d);
        test::end(test);
    }
}