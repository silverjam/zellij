#[cfg(test)]
#[cfg(feature = "web_server_capability")]
mod terminal_loop_tests;

#[test]
fn detached_new_session_preserves_merged_configuration_options() {
    use super::{detached_new_session_cli_assets, CliArgs, Options};
    use zellij_utils::data::InputMode;

    let cli_args = CliArgs::default();
    let config_options = Options {
        default_mode: Some(InputMode::Locked),
        ..Default::default()
    };

    let cli_assets = detached_new_session_cli_assets(&cli_args, &config_options, None, None);

    assert_eq!(
        cli_assets.configuration_options.unwrap().default_mode,
        Some(InputMode::Locked)
    );
}
