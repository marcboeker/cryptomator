<template>
  <v-card class="mx-auto" :loading="loading > 0">
    <toolbar></toolbar>
    <v-row>
      <v-col sm="auto">
        <tree></tree>
      </v-col>
      <v-divider vertical></v-divider>
      <v-col>
        <list></list>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" width="500">
      <v-card>
        <v-card-title class="text-h5 grey lighten-2">Vault Details</v-card-title>

        <v-form v-model="valid">
          <v-card-text>
            <v-container>
              <v-row>
                <v-col>
                  <v-text-field
                    v-model="vaultConfig.password"
                    label="Vault Password"
                    type="password"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    v-model="vaultConfig.accessKeyId"
                    label="S3 Access Key ID"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    v-model="vaultConfig.secretAccessKey"
                    label="S3 Secret Access Key"
                    type="password"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    v-model="vaultConfig.bucket"
                    label="S3 Bucket"
                    required
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-text-field
                    v-model="vaultConfig.region"
                    label="S3 Region"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-checkbox
                    v-model="saveVaultConfig"
                    label="Persist Config in Local Storage"
                  ></v-checkbox>
                </v-col>
              </v-row>
            </v-container>
          </v-card-text>
        </v-form>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="saveConfig" :disabled="!valid">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';

import Tree from './Tree.vue';
import List from './List.vue';
import Toolbar from './Toolbar.vue';
import {Item} from './Item';

import S3 from '../cryptomator/storage-adapters/s3';
import Vault from '../cryptomator/vault';

import {namespace} from 'vuex-class';
const browser = namespace('Browser');

@Component({
  components: {
    Tree,
    List,
    Toolbar,
  },
})
export default class Browser extends Vue {
  private loading = 0;
  private dialog = false;
  private vaultConfig = {};
  private saveVaultConfig = false;
  private valid = false;

  @browser.Mutation
  public setCurrentItem!: (item: Item) => void;

  @browser.Mutation
  public setCurrentParentDirId!: (parentDirId: string) => void;

  @browser.Mutation
  public setVault!: (vault: Vault) => void;

  @browser.State
  public currentItem!: Item;

  @browser.State
  public currentParentDirId!: string;

  @browser.Action
  public setRoot!: () => void;

  private async mounted(): Promise<void> {
    const vaultConfig = localStorage['vaultConfig'];
    if (vaultConfig !== undefined) {
      this.vaultConfig = JSON.parse(vaultConfig);
      await this.openVault(this.vaultConfig);
    } else {
      this.dialog = true;
    }
  }

  private async openVault(vaultConfig: any): Promise<void> {
    const s3 = new S3(
      vaultConfig.accessKeyId,
      vaultConfig.secretAccessKey,
      vaultConfig.region,
      vaultConfig.bucket
    );

    const vault = new Vault(s3);
    await vault.open(vaultConfig.password);

    this.setVault(vault);
    this.setRoot();
  }

  private saveConfig(): void {
    if (this.saveVaultConfig) {
      localStorage['vaultConfig'] = JSON.stringify(this.vaultConfig);
    }
    this.dialog = false;
    this.openVault(this.vaultConfig);
  }

  loadingChanged(loading: boolean): void {
    if (loading) {
      this.loading++;
    } else if (this.loading > 0) {
      this.loading--;
    }
  }
}
</script>
